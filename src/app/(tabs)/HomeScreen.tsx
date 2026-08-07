import { Ionicons } from '@expo/vector-icons';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { auth, db } from '../../../config/firebaseConfig';

// Import your GeoJSON data
import geoJsonData from '../../../assets/custom.geo.json';

export interface CountryResult {
  cca3: string;
  cca2: string;
  name: { common: string; official: string };
  flag: string;
  region: string;
  capital?: string[];
  population?: number;
  flags?: { png: string; svg: string; alt?: string };
}

// Target SVG Dimensions
const MAP_WIDTH = 360;
const MAP_HEIGHT = 210;

// Date Formatter Helper
const getOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const formatDateRange = (start: any, end: any) => {
  if (!start) return '';
  const startDate = start.toDate ? start.toDate() : new Date(start);
  const endDate = end ? (end.toDate ? end.toDate() : new Date(end)) : null;

  const startMonth = startDate.toLocaleString('en-US', { month: 'long' });
  const startDay = getOrdinal(startDate.getDate());
  const startYear = startDate.getFullYear();

  if (!endDate || startDate.getTime() === endDate.getTime()) {
    return `${startMonth} ${startDay} ${startYear}`;
  }

  const endMonth = endDate.toLocaleString('en-US', { month: 'long' });
  const endDay = getOrdinal(endDate.getDate());
  const endYear = endDate.getFullYear();

  if (startYear !== endYear) {
    return `${startMonth} ${startDay} ${startYear} - ${endMonth} ${endDay} ${endYear}`;
  } else if (startMonth !== endMonth) {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay} ${startYear}`;
  } else {
    return `${startMonth} ${startDay} - ${endDay} ${startYear}`;
  }
};

export default function HomeScreen() {
  const router = useRouter();

  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Dynamic State variables
  const [countryColors, setCountryColors] = useState<Record<string, string>>({});
  const [exploredPercentage, setExploredPercentage] = useState<string>("0.00");
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // Search variables
  const [searchQuery, setSearchQuery] = useState('');
  const [allCountries, setAllCountries] = useState<CountryResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // 1. Fetch User Profile
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data());
          } else {
            setUserProfile({
              firstName: user.displayName?.split(' ')[0] || 'Traveler',
              lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
            });
          }

          // 2. Compute 6 months ago threshold
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

          const activities: any[] = [];
          const colors: Record<string, string> = {};
          let visitedCount = 0;

          // 3. Fetch Visited Countries
          const countriesRef = collection(db, 'users', user.uid, 'countries');
          const countriesSnap = await getDocs(countriesRef);
          
          countriesSnap.forEach(doc => {
            const data = doc.data();
            const cca3 = data.countryCode || doc.id;
            
            // Mark country as visited with color
            colors[cca3] = '#3498db'; 
            visitedCount++;

            // Check for recent activity in countries
            const recentDate = data.recentArrival || data.firstVisited || data.arrivalDate;
            const endDate = data.lastVisited || data.departureDate;
            
            if (recentDate) {
              const jsDate = recentDate.toDate ? recentDate.toDate() : new Date(recentDate);
              if (jsDate >= sixMonthsAgo) {
                activities.push({
                  id: `country-${doc.id}`,
                  title: `Visited ${data.countryName || doc.id}`,
                  location: data.countryName || doc.id,
                  dateObj: jsDate,
                  dateString: formatDateRange(recentDate, endDate),
                  image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80', // Default placeholder
                });
              }
            }
          });

          setCountryColors(colors);
          setExploredPercentage(((visitedCount / 195) * 100).toFixed(2));

          // 4. Fetch Trips
          const tripsRef = collection(db, 'users', user.uid, 'trips');
          const tripsSnap = await getDocs(tripsRef);

          tripsSnap.forEach(doc => {
            const data = doc.data();
            const startDate = data.startDate;
            const endDate = data.endDate;

            if (startDate) {
              const jsDate = startDate.toDate ? startDate.toDate() : new Date(startDate);
              if (jsDate >= sixMonthsAgo) {
                activities.push({
                  id: `trip-${doc.id}`,
                  title: data.title || 'Trip',
                  location: data.countries?.join(', ') || 'Multiple Locations',
                  dateObj: jsDate,
                  dateString: formatDateRange(startDate, endDate),
                  image: data.coverPhoto || 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=500&q=80',
                });
              }
            }
          });

          // Sort activities by most recent
          activities.sort((a, b) => b.dateObj - a.dateObj);
          setRecentActivities(activities);

        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch ALL countries on component mount for Search functionality
  useEffect(() => {
    const fetchAllCountries = async () => {
      try {
        const docRef = doc(db, 'app_data', 'countries');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const rawList = docSnap.data().countries || [];

          const parsedCountries: CountryResult[] = rawList.map((item: any, index: number) => {
            const commonName = item.name?.common || item.names?.common || '';
            const fallbackCode = `country-${index}-${commonName.replace(/\s+/g, '')}`;
            
            return {
              cca3: item.cca3 && item.cca3.trim() !== '' ? item.cca3 : fallbackCode,
              cca2: item.cca2 || '',
              name: {
                common: commonName,
                official: item.name?.official || item.names?.official || '',
              },
              flag: typeof item.flag === 'string' && item.flag.trim() !== '' 
                ? item.flag 
                : (item.flag?.emoji || '🏳️'),
              region: item.region || '',
              capital: Array.isArray(item.capital) ? item.capital : [],
              population: item.population || 0,
              flags: {
                png: item.flags?.png || item.flag?.url_png || '',
                svg: item.flags?.svg || item.flag?.url_svg || '',
              },
            };
          });

          parsedCountries.sort((a, b) => a.name.common.localeCompare(b.name.common));
          setAllCountries(parsedCountries);
        }
      } catch (err) {
        console.error('Failed to fetch countries from Firestore:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllCountries();
  }, []);

  // Filter countries in real-time based on searchQuery
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return allCountries
      .filter((country) => 
        country.name.common.toLowerCase().includes(query) ||
        country.cca3.toLowerCase().includes(query) ||
        country.cca2.toLowerCase().includes(query)
      )
      .slice(0, 7);
  }, [searchQuery, allCountries]);

  // Convert GeoJSON Features to SVG Paths
  const formattedRegions = useMemo(() => {
    if (!geoJsonData || !geoJsonData.features) return [];

    const projection = geoNaturalEarth1()
      .scale(70)
      .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2 + 10])
      .clipExtent([[0, 0], [MAP_WIDTH, MAP_HEIGHT]]);

    const pathGenerator = geoPath().projection(projection);

    return geoJsonData.features.map((feature: any, index: number) => {
      const rawId = feature.properties?.iso_a3 || feature.properties?.ISO_A3 || feature.properties?.name;
      const id = rawId && rawId !== '-99' ? String(rawId) : `region-${index}`;

      return {
        id,
        path: pathGenerator(feature) || '',
      };
    });
  }, []);

  const handleCountrySelect = (item: CountryResult) => {
    router.push({
      pathname: '../(countries)/[id]',
      params: {
        code: item.cca3,
        name: item.name.common,
        flag: item.flag,
        flagUrl: item.flags?.png || '',
        region: item.region,
        capital: item.capital?.[0] || '',
        population: String(item.population || 0),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        
        {/* HEADER */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.nameText}>
              {`${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || 'Traveler'}
            </Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={24} color="black" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="time-outline" size={24} color="black" />
            </TouchableOpacity>
          </View>
        </View>

        {/* SEARCH BAR */}
        <View style={[styles.searchWrapper, { zIndex: 1000, elevation: 1000 }]}>
          <View style={styles.searchSectionContainer}>
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
              {loading && <ActivityIndicator size="small" color="#007aff" style={styles.spinner} />}
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={18} color="#95a5a6" />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Results Dropdown */}
            {(searchQuery.length > 0 && filteredResults.length > 0) && (
              <View style={styles.searchResultsContainer}>
                <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 280 }}>
                  {filteredResults.map((item) => (
                    <TouchableOpacity
                      key={item.cca3}
                      style={styles.searchResultItem}
                      onPress={() => handleCountrySelect(item)}
                    >
                      <Text style={styles.resultFlag}>{item.flag}</Text>
                      <View style={styles.resultTextContainer}>
                        <Text style={styles.resultName}>{item.name.common}</Text>
                        <Text style={styles.resultSubtitle}>
                          {item.region} {item.capital?.[0] ? `• ${item.capital[0]}` : ''}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#bdc3c7" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* INTERACTIVE MAP CONTAINER */}
        <View style={styles.mapCard}>
          <TouchableOpacity 
            style={styles.mapWrapper} 
            activeOpacity={0.8}
            onPress={() => router.push('/MapScreen')}
          >
            <Svg height="100%" width="100%" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} pointerEvents="none">
              {formattedRegions.map((region) => {
                if (!region.path) return null;
                return (
                  <Path
                    key={region.id}
                    d={region.path}
                    fill={countryColors[region.id] || '#d3d3d3'}
                    stroke="#ffffff"
                    strokeWidth="0.5"
                  />
                );
              })}
            </Svg>
          </TouchableOpacity>

          {/* % Explored Badge */}
          <View style={styles.exploredBadge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>{exploredPercentage}% Explored</Text>
          </View>
        </View>

        {/* STATS SECTION */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={[styles.statBox, styles.statBoxBlue]}>
            <Text style={[styles.statNumber, styles.textBlue]}>
              {userProfile?.stats?.countriesVisited ?? 0}
            </Text>
            <Text style={styles.statLabel}>Countries</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statBox, styles.statBoxGreen]}
            onPress={() => router.push('../subtabs/Cities')}
          >
            <Text style={[styles.statNumber, styles.textGreen]}>
              {userProfile?.stats?.citiesVisited ?? 0}
            </Text>
            <Text style={styles.statLabel}>Cities</Text>
          </TouchableOpacity>

          <View style={[styles.statBox, styles.statBoxWhite]}>
            <Text style={styles.statNumber}>
                {userProfile?.stats?.continentsVisited ?? 0}
            </Text>
            <Text style={styles.statLabel}>Continents</Text>
          </View>
        </View>

        {/* RECENT ACTIVITY */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        
        {recentActivities.length > 0 ? (
          recentActivities.map((activity) => (
            <TouchableOpacity key={activity.id} style={styles.activityCard}>
              <Image source={{ uri: activity.image }} style={styles.activityImage} />
              <View style={styles.activityInfo}>
                <View style={styles.activityLocation}>
                  <Text style={styles.cityText} numberOfLines={1}>{activity.title}</Text>
                  <Text style={styles.countryText} numberOfLines={1}>{activity.location}</Text>
                </View>
                <Text style={styles.dateText}>{activity.dateString}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyActivityContainer}>
            <Text style={styles.emptyActivityText}>No activity within the past 6 months</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchWrapper: {
    position: 'relative',
    zIndex: 1000, 
    elevation: 1000, // Necessary for Android zIndex
    marginBottom: 16,
  },
  searchSectionContainer: {
    position: 'relative',
    zIndex: 1000,
    elevation: 1000,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#e1e8ee',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  nameText: {
    fontSize: 28,
    fontFamily: 'Playfair Display',
    fontWeight: '800',
    letterSpacing: 0.7,
    color: '#0D1B2A',
    marginTop: -2,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
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
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#2c3e50',
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  searchResultsContainer: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 2000, // Make sure zIndex is higher than parent containers
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  spinner: { 
    marginRight: 8 
  },
  resultFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  resultSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  mapCard: {
    backgroundColor: '#f0f3f5',
    borderRadius: 20,
    padding: 0,
    marginBottom: 20,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  mapWrapper: {
    width: '100%',
    height: '100%',
  },
  exploredBadge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007aff',
    marginRight: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statBox: {
    flex: 1,
    padding: 15,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  statBoxBlue: {
    backgroundColor: '#eef6ff',
    borderColor: '#d0e5ff',
  },
  statBoxGreen: {
    backgroundColor: '#eeffee',
    borderColor: '#dcf4dc',
  },
  statBoxWhite: {
    backgroundColor: '#fff',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a24',
    marginBottom: 4,
  },
  textBlue: {
    color: '#007aff',
  },
  textGreen: {
    color: '#34c759',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Playfair Display',
    fontWeight: '600',
    letterSpacing: 0.25,
    color: '#0D1B2A',
    marginBottom: 15,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 15,
  },
  activityImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 15,
  },
  activityInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityLocation: {
    flex: 1,
  },
  countryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a24',
    marginBottom: 4,
  },
  cityText: {
    fontSize: 14,
    color: '#666',
  },
  dateText: {
    fontSize: 13,
    color: '#999',
  },
  emptyActivityContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  emptyActivityText: {
    fontSize: 15,
    color: '#95a5a6',
    fontWeight: '500',
  }
});