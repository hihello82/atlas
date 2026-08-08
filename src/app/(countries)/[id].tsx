import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
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

import geoJsonData from '../../../assets/custom.geo.json';
import { db } from '../../../config/firebaseConfig';
import { colors, sharedStyles } from '../styles';

export default function CountryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code: string;
    name: string;
    flag: string;
    flagUrl: string;
    region: string;
    capital: string;
    population: string;
    continent?: string;
    photoUrl?: string;
    latitude?: string;
    longitude?: string;
  }>();

  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const user = auth.currentUser;

  const [countryUserData, setCountryUserData] = useState<{
    totalDaysVisited: number;
    tripIds: string[];
    cities: any[];
  }>({
    totalDaysVisited: 0,
    tripIds: [],
    cities: [],
  });

  // Check if current country exists in GeoJSON data
  const isCountryInGeoJson = geoJsonData.features.some(
    (feature: any) =>
      feature.properties?.iso_a3 === params.code ||
      feature.properties?.adm0_a3 === params.code
  );

  useEffect(() => {
    if (!params.code) return;

    const fetchCountryDetail = async () => {
      try {
        const docRef = doc(db, 'app_data', 'countries');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const rawData = docSnap.data().countries || docSnap.data().data || [];
          const countriesList = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

          const match = countriesList.find(
            (c: any) => (c.cca3 || c.codes?.alpha_3) === params.code
          );

          setDetails(match || null);
        }

        // Fetch user specific data for this country if user is logged in
        if (user?.uid) {
          const userCountryRef = doc(db, 'users', user.uid, 'countries', params.code);
          const userCountrySnap = await getDoc(userCountryRef);

          if (userCountrySnap.exists()) {
            const data = userCountrySnap.data();
            setCountryUserData({
              totalDaysVisited: data.totalDaysVisited || 0,
              tripIds: data.tripIds || [],
              cities: data.cities || [],
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch country detail from Firestore:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCountryDetail();
  }, [params.code, user?.uid]);

  // Dynamic values
  const countryName = details?.name?.common || params.name || 'Country Name';
  const continentName =
    (Array.isArray(details?.continents) ? details.continents.join(', ') : details?.continents) ||
    params.continent ||
    params.region ||
    'Continent';

  const rawPopulation = details?.population ?? params.population;
  const formattedPopulation =
    rawPopulation !== undefined && !isNaN(Number(rawPopulation))
      ? Number(rawPopulation).toLocaleString()
      : 'N/A';

  // Dynamic Coordinates calculation
  const latitude =
    details?.latlng?.[0] ??
    (params.latitude ? parseFloat(params.latitude) : 20.0);
  const longitude =
    details?.latlng?.[1] ??
    (params.longitude ? parseFloat(params.longitude) : 0.0);

  // Sample data for Cities Explored
  const sampleCities = [
    { id: '1', name: 'Tokyo', duration: '5 days', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=300&q=80' },
    { id: '2', name: 'Kyoto', duration: '4 days', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=300&q=80' },
    { id: '3', name: 'Osaka', duration: '5 days', image: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=300&q=80' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header Hero Section */}
        <View style={styles.heroContainer}>
          <Image
            source={{
              uri:
                params.photoUrl ||
                'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          {/* Darker Dimmed Overlay */}
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

            <TouchableOpacity
              style={[sharedStyles.backButton, styles.customNavBtn]}
              onPress={() => {}}
              activeOpacity={0.8}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Hero Country Details */}
          <View style={styles.heroTitleContainer}>
            <Text style={styles.countryTitle}>{countryName}</Text>
            <Text style={styles.countrySubtitle}>
              {continentName} · {formattedPopulation}
            </Text>
          </View>
        </View>

        {/* Dynamic Map Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.mapCard}>
            <MapView
              style={styles.map}
              provider={Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
              region={{
                latitude: latitude,
                longitude: longitude,
                latitudeDelta: 15.0,
                longitudeDelta: 15.0,
              }}
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
                  params: { code: params.code, name: params.name },
                })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonText}>Add New Visit</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Metric Cards Section */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={[styles.statCard, styles.activeStatCard]} activeOpacity={0.7}>
            <Text style={[styles.statValue, styles.activeStatText]}>
              {countryUserData.cities.length}
            </Text>
            <Text style={[styles.statLabel, styles.activeStatText]}>Visited Cities</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.7}>
            <Text style={styles.statValue}>{countryUserData.tripIds.length}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.7}>
            <Text style={styles.statValue}>{countryUserData.totalDaysVisited}</Text>
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
          {countryUserData.cities.length === 0 ? (
            <View style={styles.tripNotesContainer}>
              <Text style={styles.tripNotesText}>Cities feature coming soon!</Text>
            </View>
          ) : (
            <View style={styles.citiesList}>
              {countryUserData.cities.map((city: any) => (
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
    height: 240, // Reduced height
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)', // Darkened photo overlay
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    zIndex: 10,
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
  activeStatCard: {
    backgroundColor: '#E6F4EA',
    borderColor: 'transparent',
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
  activeStatText: {
    color: '#0D622D',
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
    justifyContent: 'space-between', // Aligns photo/city to left and badge to right
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