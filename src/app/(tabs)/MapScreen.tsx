import { Ionicons } from '@expo/vector-icons';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import geoJsonData from '../../../assets/custom.geo.json';
import { db } from '../../../config/firebaseConfig';
import { useUser } from '../context/UserContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MAP_HEIGHT = SCREEN_HEIGHT;
const MAP_WIDTH = SCREEN_HEIGHT * 1.6;

interface CountryDetail {
  code: string;
  name: string;
  flag: string;
  capital: string;
  totalTrips: number;
  daysSpent: number;
  visitedCities: string[];
}

interface VisitedListItem {
  code: string;
  name: string;
  flag: string;
  totalTrips: number;
  coverPhoto?: string;
}

export default function MapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const { visitedCountryCodes, getVisitedCountryDetail } = useUser();

  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [selectedCountryData, setSelectedCountryData] = useState<CountryDetail | null>(null);

  // Info Screen States
  const [activeTab, setActiveTab] = useState<string>('Visited');
  const [searchQuery, setSearchQuery] = useState('');
  const [visitedList, setVisitedList] = useState<VisitedListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);

  // Animations
  const popupSlideAnim = useRef(new Animated.Value(400)).current;
  const infoY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const infoStateRef = useRef<'large' | 'default' | 'small' | 'hidden'>('hidden');

  // Horizontal map panning
  const horizontalScrollRef = useRef<ScrollView>(null);

  // Snap Points for Info Screen
const snapPoints = useMemo(() => ({
  large: insets.top + 20,
  default: SCREEN_HEIGHT - 380,
  small: SCREEN_HEIGHT - insets.bottom - 95,
  hidden: SCREEN_HEIGHT * 1.5, // Pushes completely off the screen
}), [insets]);

  // Center map horizontally on mount
  useEffect(() => {
    const centerOffset = (MAP_WIDTH - SCREEN_WIDTH) / 2;
    horizontalScrollRef.current?.scrollTo({ x: centerOffset, animated: false });
  }, []);

  // Handle routing params payload
useEffect(() => {
  if (params.infoSize === 'large' && params.section) {
    setActiveTab(params.section as string);
    animateInfoTo('large');
  } else {
    animateInfoTo('default');
  }
}, [params.infoSize, params.section]);

  // Fetch data for the Visited List
  useEffect(() => {
    const fetchVisitedData = async () => {
      setListLoading(true);
      try {
        const countryDocRef = doc(db, 'app_data', 'countries');
        const docSnap = await getDoc(countryDocRef);
        const rawList = docSnap.exists() ? docSnap.data().countries || [] : [];

        const codes = Object.keys(visitedCountryCodes);
        const fetchPromises = codes.map(async (code) => {
          const detail = await getVisitedCountryDetail(code);
          const match = rawList.find((c: any) => c.cca3 === code || c.cca2 === code);
          const name = match ? (match.name?.common || match.names?.common || code) : code;
          const flag = match ? (typeof match.flag === 'string' ? match.flag : match.flag?.emoji || '🏳️') : '🏳️';
          
          return {
            code,
            name,
            flag,
            totalTrips: detail.totalTrips || 1,
            // Assert coverPhoto availability assuming user context fetches it or fallback 
            coverPhoto: (detail as any).coverPhoto || null, 
          };
        });

        const results = await Promise.all(fetchPromises);
        setVisitedList(results.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Failed to load visited list:', err);
      } finally {
        setListLoading(false);
      }
    };

    if (Object.keys(visitedCountryCodes).length > 0) {
      fetchVisitedData();
    }
  }, [visitedCountryCodes, getVisitedCountryDetail]);

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

  // -- Animations & Interactivity --

  const animateInfoTo = (state: 'large' | 'default' | 'small' | 'hidden') => {
    infoStateRef.current = state;
    Animated.spring(infoY, {
      toValue: snapPoints[state],
      tension: 60,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const slideInPopup = () => {
    Animated.spring(popupSlideAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const slideOutPopup = (callback?: () => void) => {
    Animated.timing(popupSlideAnim, {
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

  // Immediately hide Info Popup before sliding up Country Popup
  animateInfoTo('hidden');
  
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

const handleDismissPopup = () => {
  if (selectedCountryCode) {
    slideOutPopup(() => {
      animateInfoTo('default'); // Brings Info Popup back into 'default' mode after popup exits
    });
  }
};

  const handleAddNewVisit = () => {
    const code = selectedCountryCode;
    const name = selectedCountryData?.name || '';
    slideOutPopup(() => {
      if (code) {
        router.push({
          pathname: '../subtabs/addTrip',
          params: { code, name }, // Now passing both correctly
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

  // Info Screen PanResponder (Attached to Header Handle)
  let lastInfoY = snapPoints.default;
  infoY.addListener(({ value }) => { lastInfoY = value; });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderGrant: () => {
        infoY.setOffset(lastInfoY);
        infoY.setValue(0);
      },
      onPanResponderMove: Animated.event([null, { dy: infoY }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gesture) => {
        infoY.flattenOffset();
        const currentY = lastInfoY + gesture.dy;
        
        // Find closest snap point
        const points = [
          { state: 'large', val: snapPoints.large },
          { state: 'default', val: snapPoints.default },
          { state: 'small', val: snapPoints.small },
        ];
        
        const closest = points.reduce((prev, curr) => 
          Math.abs(curr.val - currentY) < Math.abs(prev.val - currentY) ? curr : prev
        );

        animateInfoTo(closest.state as 'large' | 'default' | 'small');
      },
    })
  ).current;

  // Background Dimming (only dims on 'large')
  const dimOpacity = infoY.interpolate({
    inputRange: [snapPoints.large, snapPoints.default],
    outputRange: [0.5, 0],
    extrapolate: 'clamp',
  });

  // Filter List Results
  const displayedList = visitedList.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

return (
  <View style={styles.container}>
    {/* Top Fade Gradient overlay replacing the white SafeArea bar */}
    <LinearGradient
      colors={['rgba(248, 249, 250, 0.95)', 'rgba(248, 249, 250, 0)']}
      style={[styles.topFadeGradient, { height: insets.top + 40 }]}
      pointerEvents="none"
    />
      <View style={styles.flex}>
        {/* Outer Map Scroll Layer */}
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
              <Svg width={MAP_WIDTH} height={MAP_HEIGHT} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
                {formattedRegions.map((region) => {
                  if (!region.path) return null;
                  const isVisited = visitedCountryCodes[region.id];
                  return (
                    <Path
                      key={region.id}
                      d={region.path}
                      fill={isVisited || '#d3d3d3'}
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

        {/* Dismissal Backdrop Layer for Country Popup */}
        {selectedCountryCode && (
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismissPopup} />
        )}

        {/* Dimming Backdrop for Large Info Screen */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: dimOpacity }]} />

        {/* ----- INFO SCREEN (Draggable Multi-state Modal) ----- */}
        <Animated.View 
          style={[styles.infoScreenOverlay, { transform: [{ translateY: infoY }] }]}
        >
          {/* Header Drag Handle */}
          <View {...panResponder.panHandlers} style={styles.dragHeader}>
            <View style={styles.dragPill} />
          </View>

          {/* Search Bar matching HomeScreen */}
          <View style={styles.searchBarContainer}>
            <Ionicons name="search-outline" size={20} color="#7f8c8d" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search countries..."
              placeholderTextColor="#95a5a6"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color="#95a5a6" />
              </TouchableOpacity>
            )}
          </View>

          {/* Nav Tabs */}
          <View style={styles.tabsContainer}>
            {['Visited', 'Saved', 'Trips', 'Lived'].map((tab) => (
              <TouchableOpacity 
                key={tab} 
                style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Section Content Rendering */}
          <View style={styles.infoContent}>
            {activeTab === 'Visited' ? (
              listLoading ? (
                <ActivityIndicator size="large" color="#007aff" style={{ marginTop: 20 }} />
              ) : displayedList.length > 0 ? (
                <FlatList
                  data={displayedList}
                  keyExtractor={(item) => item.code}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.listItemRow}>
                      <View style={styles.listImageContainer}>
                        {item.coverPhoto ? (
                          <Image source={{ uri: item.coverPhoto }} style={styles.listImage} />
                        ) : (
                          <View style={[styles.listImage, styles.fallbackImage]}>
                            <Text style={styles.fallbackFlag}>{item.flag}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.listItemTextContainer}>
                        <Text style={styles.listNameText}>{item.name}</Text>
                        <Text style={styles.listSubText}>Visited {item.totalTrips} {item.totalTrips === 1 ? 'time' : 'times'}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                    </TouchableOpacity>
                  )}
                />
              ) : (
                <Text style={styles.emptyStateText}>No countries found.</Text>
              )
            ) : (
              <View style={styles.comingSoonContainer}>
                <Text style={styles.comingSoonText}>Feature coming soon!</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ----- COUNTRY DETAILS POPUP (Animated Slide Up) ----- */}
        {selectedCountryCode && (
          <Animated.View
            pointerEvents="box-none"
            style={[
              styles.popupOverlay,
              {
                bottom: insets.bottom + 12,
                transform: [{ translateY: popupSlideAnim }],
              },
            ]}
          >
            <Pressable style={styles.popupCard} onPress={handlePopupContentPress}>
              {/* Close (X) Button */}
              <TouchableOpacity style={styles.closeButton} onPress={handleDismissPopup}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>

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
    </View>
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
  topFadeGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  
  // Country Details Popup Styles
  popupOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 200,
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
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    padding: 4,
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingRight: 24,
  },
  popupFlag: { fontSize: 32, marginRight: 12 },
  popupTitleContainer: { flex: 1 },
  popupCountryName: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  popupCapital: { fontSize: 13, color: '#64748b', marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#007aff' },
  statTitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statDivider: { width: 1, height: '60%', backgroundColor: '#e2e8f0' },
  citiesContainer: { marginBottom: 16 },
  citiesLabel: { fontSize: 12, fontWeight: '600', color: '#334155' },
  citiesList: { fontSize: 13, color: '#64748b', marginTop: 2 },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#007aff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  loadingContainer: { paddingVertical: 20, alignItems: 'center' },
  loadingText: { color: '#64748b', fontSize: 14 },

  // Draggable Info Screen Styles
  infoScreenOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 100,
  },
dragHeader: {
    width: '100%',
    paddingVertical: 8, // Reduced from 16 to make the top handle area smaller
    alignItems: 'center',
  },
  dragPill: {
    width: 36,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    height: 52,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#2c3e50', height: '100%' },
  clearButton: { padding: 4 },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  activeTabButton: { backgroundColor: '#0f172a' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  activeTabText: { color: '#ffffff' },
  infoContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  
  // List Item Styles
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  listImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 14,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  fallbackImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fallbackFlag: { fontSize: 24 },
  listItemTextContainer: { flex: 1, justifyContent: 'center' },
  listNameText: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  listSubText: { fontSize: 13, color: '#64748b' },
  emptyStateText: { textAlign: 'center', marginTop: 30, color: '#94a3b8', fontSize: 15 },
  comingSoonContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  comingSoonText: { fontSize: 16, fontWeight: '500', color: '#94a3b8' },
});