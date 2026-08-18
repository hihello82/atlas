import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DetailedTripItem, useUser } from '../context/UserContext';
import { colors, sharedStyles } from '../styles';

const getOrdinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const formatDateRange = (start: any, end: any) => {
  if (!start) return 'N/A';
  const startDate = start.toDate ? start.toDate() : new Date(start);
  const endDate = end ? (end.toDate ? end.toDate() : new Date(end)) : null;

  if (isNaN(startDate.getTime())) return 'N/A';

  const startMonth = startDate.toLocaleString('en-US', { month: 'long' });
  const startDay = getOrdinal(startDate.getDate());
  const startYear = startDate.getFullYear();

  if (!endDate) {
    return `${startMonth} ${startDay} ${startYear}`;
  }

  const endJSDate = endDate.toDate ? endDate.toDate() : new Date(endDate);
  if (isNaN(endJSDate.getTime()) || startDate.getTime() === endJSDate.getTime()) {
    return `${startMonth} ${startDay} ${startYear}`;
  }

  const endMonth = endJSDate.toLocaleString('en-US', { month: 'long' });
  const endDay = getOrdinal(endJSDate.getDate());
  const endYear = endJSDate.getFullYear();

  if (startYear !== endYear) {
    return `${startMonth} ${startDay} ${startYear} - ${endMonth} ${endDay} ${endYear}`;
  } else if (startMonth !== endMonth) {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay} ${startYear}`;
  } else {
    return `${startMonth} ${startDay} - ${endDay} ${startYear}`;
  }
};

export default function TripDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tripid?: string; tripId?: string; id?: string }>();
  const tripId = params.tripid || params.tripId || params.id;

  const { getTripDetail } = useUser();
  const [trip, setTrip] = useState<DetailedTripItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getTripDetail(tripId)
      .then((data) => {
        if (isMounted) {
          setTrip(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching trip details:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [tripId, getTripDetail]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primaryBlue} />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Trip not found.</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tripTitle = trip.title || 'Trip Details';
  const tripDatesFormatted = formatDateRange(trip.startDate, trip.endDate);
  const coverPhotoUri =
    trip.coverPhoto ||
    (trip.photos && trip.photos[0]?.url) ||
    'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80';

  const countryCount = trip.countryDetails?.length || trip.countries?.length || 0;
  const cityCount = trip.cities?.length || 0;
  const photoCount = trip.photos?.length || 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header Hero Section */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: coverPhotoUri }} style={styles.heroImage} resizeMode="cover" />
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

          {/* Hero Trip Details */}
          <View style={styles.heroTitleContainer}>
            <Text style={styles.tripTitle}>{tripTitle}</Text>
            <Text style={styles.tripSubtitle}>{tripDatesFormatted}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.primaryStatCard]}>
            <Text style={[styles.statValue, styles.primaryStatText]}>{countryCount}</Text>
            <Text style={[styles.statLabel, styles.primaryStatText]}>
              {countryCount === 1 ? 'Country' : 'Countries'}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{cityCount}</Text>
            <Text style={styles.statLabel}>{cityCount === 1 ? 'City' : 'Cities'}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{photoCount}</Text>
            <Text style={styles.statLabel}>{photoCount === 1 ? 'Photo' : 'Photos'}</Text>
          </View>
        </View>

        {/* Trip Description */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>DESCRIPTION</Text>
          <View style={styles.cardContainer}>
            <Text style={styles.descriptionText}>
              {trip.description && trip.description.trim() !== ''
                ? trip.description
                : 'No description provided for this trip.'}
            </Text>
          </View>
        </View>

        {/* Countries & Dates Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>COUNTRIES VISITED</Text>
          {trip.countryDetails && trip.countryDetails.length > 0 ? (
            <View style={styles.itemList}>
              {trip.countryDetails.map((countryItem) => (
                <View key={countryItem.countryCode} style={styles.countryCard}>
                  <View style={styles.countryHeader}>
                    <Ionicons name="location-outline" size={20} color={colors.primaryBlue} />
                    <Text style={styles.countryName}>
                      {countryItem.countryName || countryItem.countryCode}
                    </Text>
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>{countryItem.countryCode}</Text>
                    </View>
                  </View>
                  <Text style={styles.countryDatesText}>
                    {formatDateRange(countryItem.arrivalDate, countryItem.departureDate)}
                  </Text>
                  {countryItem.description ? (
                    <Text style={styles.countryNotesText}>{countryItem.description}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : trip.countries && trip.countries.length > 0 ? (
            <View style={styles.itemList}>
              {trip.countries.map((code) => (
                <View key={code} style={styles.countryCard}>
                  <View style={styles.countryHeader}>
                    <Ionicons name="location-outline" size={20} color={colors.primaryBlue} />
                    <Text style={styles.countryName}>{code}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.cardContainer}>
              <Text style={styles.descriptionText}>No countries recorded.</Text>
            </View>
          )}
        </View>

        {/* Cities Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>CITIES EXPLORED</Text>
          {trip.cities && trip.cities.length > 0 ? (
            <View style={styles.citiesGrid}>
              {trip.cities.map((city, index) => (
                <View key={`${city}-${index}`} style={styles.cityChip}>
                  <Ionicons name="business-outline" size={16} color={colors.titleDark} />
                  <Text style={styles.cityChipText}>{city}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.cardContainer}>
              <Text style={styles.descriptionText}>No cities listed for this trip.</Text>
            </View>
          )}
        </View>

        {/* Photos Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>PHOTOS ({photoCount})</Text>
          {trip.photos && trip.photos.length > 0 ? (
            <View style={styles.photosGrid}>
              {trip.photos.map((photo, index) => (
                <View key={index} style={styles.photoCard}>
                  <Image source={{ uri: photo.url }} style={styles.photoImage} resizeMode="cover" />
                  {photo.caption ? (
                    <View style={styles.photoCaptionContainer}>
                      <Text style={styles.photoCaptionText} numberOfLines={2}>
                        {photo.caption}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.cardContainer}>
              <Text style={styles.descriptionText}>No photos attached to this trip.</Text>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.titleDark,
    marginBottom: 12,
  },
  backLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.primaryBlue,
    borderRadius: 8,
  },
  backLinkText: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  tripTitle: {
    fontSize: 32,
    fontFamily: 'Playfair Display',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tripSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },

  /* Layout Sections */
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.titleDark,
    marginBottom: 12,
  },
  cardContainer: {
    backgroundColor: '#F0F4F8',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  descriptionText: {
    fontSize: 15,
    color: colors.subtitleGray,
    lineHeight: 22,
    fontWeight: '400',
  },

  /* Stats Row */
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
  primaryStatCard: {
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
  primaryStatText: {
    color: '#007aff',
  },

  /* Countries List */
  itemList: {
    gap: 10,
  },
  countryCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  countryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  countryName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.titleDark,
  },
  countryDatesText: {
    fontSize: 13,
    color: colors.subtitleGray,
    fontWeight: '500',
    marginTop: 2,
  },
  countryNotesText: {
    fontSize: 14,
    color: colors.titleDark,
    marginTop: 8,
    fontStyle: 'italic',
  },
  badgeContainer: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subtitleGray,
  },

  /* Cities Grid */
  citiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cityChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.titleDark,
  },

  /* Photos Grid */
  photosGrid: {
    gap: 12,
  },
  photoCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  photoImage: {
    width: '100%',
    height: 200,
  },
  photoCaptionContainer: {
    padding: 12,
    backgroundColor: colors.white,
  },
  photoCaptionText: {
    fontSize: 14,
    color: colors.titleDark,
    fontWeight: '500',
  },
});