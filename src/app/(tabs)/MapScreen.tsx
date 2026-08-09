import { Ionicons } from '@expo/vector-icons';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import geoJsonData from '../../../assets/custom.geo.json';
import { db } from '../../../config/firebaseConfig';
import { useUser } from '../context/UserContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MAP_HEIGHT = SCREEN_HEIGHT * 0.9;
const MAP_WIDTH = SCREEN_HEIGHT * 1.8;

interface CountryDetail {
  code: string;
  name: string;
  flag: string;
  capital: string;
  totalTrips: number;
  daysSpent: number;
  visitedCities: string[];
}

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { visitedCountryCodes, getVisitedCountryDetail } = useUser();

  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [selectedCountryData, setSelectedCountryData] = useState<CountryDetail | null>(null);

  // Animated Y-translation value for slide in/out
  const slideAnim = useRef(new Animated.Value(400)).current;

  const horizontalScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const centerOffset = (MAP_WIDTH - SCREEN_WIDTH) / 2;
    horizontalScrollRef.current?.scrollTo({ x: centerOffset, animated: false });
  }, []);

  const formattedRegions = useMemo(() => {
    if (!geoJsonData || !geoJsonData.features) return [];

    const projection = geoNaturalEarth1().fitSize([MAP_WIDTH, MAP_HEIGHT], geoJsonData as any);
    const pathGenerator = geoPath().projection(projection);

    return geoJsonData.features.map((feature: any, index: number) => {
      const rawId =
        feature.properties?.iso_a3 ||
        feature.properties?.ISO_A3 ||
        feature.properties?.name;

      const id = rawId && rawId !== '-99' ? String(rawId) : `region-${index}`;

      return {
        id,
        path: pathGenerator(feature) || '',
        name: feature.properties?.name || id,
      };
    });
  }, []);

  const slideInPopup = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const slideOutPopup = (callback?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setSelectedCountryCode(null);
      setSelectedCountryData(null);
      if (callback) callback();
    });
  };

  const handleCountryClick = async (countryCode: string, fallbackName: string) => {
    if (selectedCountryCode === countryCode) return;

    setSelectedCountryCode(countryCode);
    setSelectedCountryData(null);
    slideInPopup();

    try {
      const countryDocRef = doc(db, 'app_data', 'countries');
      const docSnap = await getDoc(countryDocRef);

      let fetchedName = fallbackName;
      let flag = '🏳️';
      let capital = 'N/A';

      if (docSnap.exists()) {
        const rawList = docSnap.data().countries || [];
        const match = rawList.find(
          (c: any) => c.cca3 === countryCode || c.cca2 === countryCode
        );

        if (match) {
          fetchedName = match.name?.common || match.names?.common || fallbackName;
          flag = typeof match.flag === 'string' ? match.flag : match.flag?.emoji || '🏳️';
          capital = Array.isArray(match.capital) ? match.capital[0] : 'N/A';
        }
      }

      const visitedDetails = await getVisitedCountryDetail(countryCode);

      setSelectedCountryData({
        code: countryCode,
        name: fetchedName,
        flag,
        capital,
        totalTrips: visitedDetails.totalTrips,
        daysSpent: visitedDetails.daysSpent,
        visitedCities: visitedDetails.visitedCities,
      });
    } catch (err) {
      console.error('Error fetching country data for popup:', err);
      setSelectedCountryData({
        code: countryCode,
        name: fallbackName,
        flag: '🏳️',
        capital: 'N/A',
        totalTrips: 0,
        daysSpent: 0,
        visitedCities: [],
      });
    }
  };

  const handleDismiss = () => {
    if (selectedCountryCode) {
      slideOutPopup();
    }
  };

  const handleAddNewVisit = () => {
    const code = selectedCountryCode;
    slideOutPopup(() => {
      if (code) {
        router.push({
          pathname: '../subtabs/addTrip',
          params: { countryCode: code },
        });
      }
    });
  };

  const handlePopupContentPress = () => {
    const country = selectedCountryData;
    const targetId = country?.code || selectedCountryCode || '';

    if (!targetId) return;

    slideOutPopup(() => {
      router.push({
        pathname: '/(countries)/[id]',
        params: {
          id: targetId,
          name: country?.name || '',
          flag: country?.flag || '',
        },
      });
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.flex}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          minimumZoomScale={1}
          maximumZoomScale={5}
          bouncesZoom={true}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            ref={horizontalScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.mapContainer}>
              <Svg
                width={MAP_WIDTH}
                height={MAP_HEIGHT}
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
              >
                {formattedRegions.map((region) => {
                  if (!region.path) return null;

                  const isVisited = visitedCountryCodes[region.id];
                  const fillColor = isVisited || '#d3d3d3';

                  return (
                    <Path
                      key={region.id}
                      d={region.path}
                      fill={fillColor}
                      stroke="#ffffff"
                      strokeWidth="0.5"
                      onPress={() => handleCountryClick(region.id, region.name)}
                    />
                  );
                })}
              </Svg>
            </View>
          </ScrollView>
        </ScrollView>

        {/* Dismissal Backdrop Layer */}
        {selectedCountryCode && (
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        )}

        {/* Sliding Country Info Popup Card */}
        {selectedCountryCode && (
          <Animated.View
            pointerEvents="box-none"
            style={[
              styles.popupOverlay,
              {
                bottom: insets.bottom + 12,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Pressable style={styles.popupCard} onPress={handlePopupContentPress}>
              {selectedCountryData ? (
                <>
                  <View style={styles.popupHeader}>
                    <Text style={styles.popupFlag}>{selectedCountryData.flag}</Text>
                    <View style={styles.popupTitleContainer}>
                      <Text style={styles.popupCountryName}>{selectedCountryData.name}</Text>
                      <Text style={styles.popupCapital}>Capital: {selectedCountryData.capital}</Text>
                    </View>
                  </View>

                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{selectedCountryData.totalTrips}</Text>
                      <Text style={styles.statTitle}>Total Trips</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{selectedCountryData.daysSpent}</Text>
                      <Text style={styles.statTitle}>Days Spent</Text>
                    </View>
                  </View>

                  <View style={styles.citiesContainer}>
                    <Text style={styles.citiesLabel}>Visited Cities:</Text>
                    <Text style={styles.citiesList} numberOfLines={2}>
                      {selectedCountryData.visitedCities.length > 0
                        ? selectedCountryData.visitedCities.join(', ')
                        : 'Cities feature coming soon!'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleAddNewVisit();
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                    <Text style={styles.addButtonText}>Add New Visit</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading country details...</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
  },
  popupOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 100,
    marginBottom: 20
  },
  popupCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  popupFlag: {
    fontSize: 32,
    marginRight: 12,
  },
  popupTitleContainer: {
    flex: 1,
  },
  popupCountryName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  popupCapital: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007aff',
  },
  statTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#e2e8f0',
  },
  citiesContainer: {
    marginBottom: 16,
  },
  citiesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  citiesList: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#007aff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
  },
});