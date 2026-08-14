import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { doc, getDoc } from 'firebase/firestore';
import geoJsonData from '../../../assets/custom.geo.json';
import { db } from '../../../config/firebaseConfig';
import { useUser } from '../context/UserContext';
import { colors, sharedStyles } from '../styles';

// Computes a camera region that fits a set of lat/lng points.
// Unlike MapView's built-in fitToCoordinates, this handles countries whose
// geometry crosses the antimeridian (e.g. Russia, Fiji) by shifting
// longitudes into a continuous range before taking min/max, instead of
// naively spanning -180..180 (which would zoom out to show the whole globe).
function getFittedRegion(
  coordinates: { latitude: number; longitude: number }[],
  paddingFactor = 1.4
) {
  if (coordinates.length === 0) return null;

  const lats = coordinates.map((c) => c.latitude);
  const rawLngs = coordinates.map((c) => c.longitude);

  const naiveSpan = Math.max(...rawLngs) - Math.min(...rawLngs);

  // If the naive span is huge, this geometry likely crosses the antimeridian.
  // Shift negative longitudes by +360 so the ring becomes contiguous, e.g.
  // [170, 178, -179, -170] -> [170, 178, 181, 190].
  const lngs =
    naiveSpan > 180 ? rawLngs.map((lng) => (lng < 0 ? lng + 360 : lng)) : rawLngs;

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latDelta = Math.max((maxLat - minLat) * paddingFactor, 1);
  const lngDelta = Math.max((maxLng - minLng) * paddingFactor, 1);

  let centerLng = (minLng + maxLng) / 2;
  // Normalize back into the standard -180..180 range.
  centerLng = ((centerLng + 540) % 360) - 180;

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: centerLng,
    latitudeDelta: latDelta,
    longitudeDelta: Math.min(lngDelta, 359),
  };
}

export default function CountryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code: string;
  }>();

  const mapRef = useRef<MapView>(null);

  const { getVisitedCountryDetail, isCountrySaved, toggleSaveCountry } = useUser();

  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  const [countryUserData, setCountryUserData] = useState<{
    totalTrips: number;
    daysSpent: number;
    visitedCities: any[];
  }>({
    totalTrips: 0,
    daysSpent: 0,
    visitedCities: [],
  });

  const isCountryInGeoJson = geoJsonData.features.some(
    (feature: any) =>
      feature.properties?.iso_a3 === params.code ||
      feature.properties?.adm0_a3 === params.code
  );

  useEffect(() => {
    // Wait until the native map view has actually finished initializing.
    // Calling camera methods (or setting a region) before onMapReady fires
    // can silently no-op, especially on Android, leaving the map stuck on
    // its generic fallback region.
    if (!params.code || !mapRef.current || !isMapReady) return;

    const feature = geoJsonData.features.find(
      (f: any) =>
        f.properties?.iso_a3 === params.code ||
        f.properties?.adm0_a3 === params.code
    );

    if (feature) {
      // Extract geometry coordinates (handles Polygon & MultiPolygon)
      let coordinates: { latitude: number; longitude: number }[] = [];

      if (feature.geometry.type === 'Polygon') {
        // Cast to standard coordinate ring type: Array<[longitude, latitude]>
        const rings = feature.geometry.coordinates as [number, number][][];
        coordinates = rings[0].map(([lng, lat]) => ({
          latitude: lat,
          longitude: lng,
        }));
      } else if (feature.geometry.type === 'MultiPolygon') {
        // Cast MultiPolygon coordinates: Array<PolygonRings>
        const polygons = feature.geometry.coordinates as [number, number][][][];
        coordinates = polygons.flatMap((polygon) =>
          polygon[0].map(([lng, lat]) => ({
            latitude: lat,
            longitude: lng,
          }))
        );
      }

      // Use a dateline-safe fit instead of MapView's built-in
      // fitToCoordinates, which naively spans -180..180 for countries like
      // Russia or Fiji and ends up zooming out to show the whole world.
      const region = getFittedRegion(coordinates);
      if (region) {
        mapRef.current.animateToRegion(region, 500);
      }
    }
  }, [params.code, isMapReady]);

  useEffect(() => {
  if (!params.code) return;

  const fetchCountryData = async () => {
    setLoading(true);
    try {
      const countryDocRef = doc(db, 'app_data', 'countries');
      const docSnap = await getDoc(countryDocRef);
      const rawList = docSnap.exists() ? docSnap.data().countries || [] : [];

      const match = rawList.find(
        (c: any) => c.cca3 === params.code || c.cca2 === params.code
      );
      setDetails(match || null);

      const visitedDetails = await getVisitedCountryDetail(params.code);
      setCountryUserData({
        totalTrips: visitedDetails?.totalTrips || 0,
        daysSpent: visitedDetails?.daysSpent || 0,
        visitedCities: visitedDetails?.visitedCities || [],
      });

      setIsSaved(await isCountrySaved(params.code));
    } catch (err) {
      console.error('Failed to load country details:', err);
    } finally {
      setLoading(false);
    }
  };

  fetchCountryData();
}, [params.code, getVisitedCountryDetail, isCountrySaved]);

  const handleStarPress = async () => {
    const nextSavedState = await toggleSaveCountry(params.code, countryName);
    setIsSaved(nextSavedState);
  };

  const countryName = details?.name?.common || 'Country Name';
  const regionName = details?.region || 'Region';

  const rawPopulation = details?.population;
  const formattedPopulation =
    rawPopulation !== undefined && !isNaN(Number(rawPopulation))
      ? Number(rawPopulation).toLocaleString()
      : 'N/A';

  const latitude = details?.latlng?.[0] ?? 20.0;
  const longitude = details?.latlng?.[1] ?? 0.0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header Hero Section */}
        <View style={styles.heroContainer}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />

          {/* Top Navigation Row */}
          <SafeAreaView style={styles.topNav}>
            <TouchableOpacity
              style={[sharedStyles.backButton, styles.customNavBtn]}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.rightNavButtons}>
              {isCountryInGeoJson && (
                <TouchableOpacity
                  style={[sharedStyles.backButton, styles.customNavBtn]}
                  onPress={handleStarPress}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isSaved ? 'star' : 'star-outline'}
                    size={20}
                    color={isSaved ? '#FFBF00' : '#FFFFFF'}
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[sharedStyles.backButton, styles.customNavBtn]}
                onPress={() => { }}
                activeOpacity={0.8}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Hero Country Details */}
          <View style={styles.heroTitleContainer}>
            <Text style={styles.countryTitle}>{countryName}</Text>
            <Text style={styles.countrySubtitle}>
              {regionName} · {formattedPopulation}
            </Text>
          </View>
        </View>

        {/* Dynamic Map Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.mapCard}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
              initialRegion={{
                latitude: latitude,
                longitude: longitude,
                latitudeDelta: 15.0,
                longitudeDelta: 15.0,
              }}
              onMapReady={() => setIsMapReady(true)}
              scrollEnabled={false}
              zoomEnabled={false}
            />
          </View>
        </View>

        {/* Add New Visit Button Directly Under Map */}
        {isCountryInGeoJson && (
          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                router.push({
                  pathname: '../subtabs/addTrip',
                  params: { code: params.code, name: countryName },
                })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonText}>Add New Visit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Metric Cards Section: Visits, Cities, Days Spent */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={[styles.statCard, styles.visitsStatCard]} activeOpacity={0.7}>
            <Text style={[styles.statValue, styles.visitsStatText]}>
              {countryUserData.totalTrips}
            </Text>
            <Text style={[styles.statLabel, styles.visitsStatText]}>Visits</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.7}>
            <Text style={styles.statValue}>{countryUserData.visitedCities.length}</Text>
            <Text style={styles.statLabel}>Cities</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.7}>
            <Text style={styles.statValue}>{countryUserData.daysSpent}</Text>
            <Text style={styles.statLabel}>Days Spent</Text>
          </TouchableOpacity>
        </View>

        {/* Trip Notes Section */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity style={styles.tripNotesContainer} activeOpacity={0.8}>
            <Text style={styles.sectionHeaderTitle}>TRIP NOTES</Text>
            <Text style={styles.tripNotesText}>AI Trips Summary is coming soon!</Text>
          </TouchableOpacity>
        </View>

        {/* Cities Explored Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>CITIES EXPLORED</Text>
          {countryUserData.visitedCities.length === 0 ? (
            <View style={styles.tripNotesContainer}>
              <Text style={styles.tripNotesText}>Cities feature coming soon!</Text>
            </View>
          ) : (
            <View style={styles.citiesList}>
              {countryUserData.visitedCities.map((city: any) => (
                <TouchableOpacity
                  key={city.id || city.name}
                  style={[sharedStyles.socialButton, styles.cityCardOverride]}
                  activeOpacity={0.7}
                >
                  <View style={styles.cityLeftRow}>
                    <Image source={{ uri: city.image }} style={styles.cityImage} />
                    <Text style={styles.cityName}>{city.name}</Text>
                  </View>
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{city.duration || '0 days'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.appBackground,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* Hero Section */
  heroContainer: {
    height: 240,
    width: '100%',
    position: 'relative',
    justifyContent: 'space-between',
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    zIndex: 10,
  },
  rightNavButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customNavBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  heroTitleContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    zIndex: 10,
  },
  countryTitle: {
    fontSize: 32,
    fontFamily: 'Playfair Display',
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
  },
  countrySubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },

  /* Common Layout Elements */
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.titleDark,
    marginBottom: 12,
  },

  /* Map Card */
  mapCard: {
    height: 150,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },

  /* Add Visit Button */
  addButton: {
    backgroundColor: colors.primaryBlue,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },

  /* Interactive Stats Section */
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'flex-start',
  },
  visitsStatCard: {
    backgroundColor: '#eef6ff',
    borderColor: '#d0e5ff',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.titleDark,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.subtitleGray,
  },
  visitsStatText: {
    color: '#007aff',
  },

  /* Trip Notes Box */
  tripNotesContainer: {
    backgroundColor: '#F0F4F8',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tripNotesText: {
    fontSize: 15,
    color: colors.subtitleGray,
    lineHeight: 22,
    fontWeight: '400',
  },

  /* Cities Explored List Layout */
  citiesList: {
    gap: 4,
  },
  cityCardOverride: {
    width: '100%',
    height: 72,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  cityLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cityImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.titleDark,
  },
  badgeContainer: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtitleGray,
  },
});