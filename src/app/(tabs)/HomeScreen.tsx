import { Ionicons } from '@expo/vector-icons';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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

// Import your GeoJSON data (or replace with local object)
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

// Mock session data
const MOCK_SESSION = {
  exploredPercentage: 12,
};

// Mock cloud data
const MOCK_CLOUD_DATA = {
  stats: {
    countries: 23,
    cities: 0,
    continents: 5,
  },
  recentActivity: [
    {
      id: '1',
      city: 'Tokyo',
      country: 'Japan',
      date: 'March 2024',
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=500&q=80',
    }
  ]
};

// Target SVG Dimensions
const MAP_WIDTH = 360;
const MAP_HEIGHT = 210;

export default function HomeScreen() {
  const router = useRouter();

  const [userName, setUserName] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Fetch user metadata stored under users/{userId}
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            // Use firstName/lastName if available, or fall back to displayName
            const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
            setUserName(fullName || user.displayName || 'Traveler');
          } else {
            setUserName(user.displayName || 'Traveler');
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // State for map colors & search query
  const [countryColors, setCountryColors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [allCountries, setAllCountries] = useState<CountryResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch ALL countries on component mount
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
        } else {
          console.error('No document found at app_data/countries');
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
      .slice(0, 7); // Cap the list length at 7 before passing to rendering
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
      const rawId =
        feature.properties?.iso_a3 ||
        feature.properties?.ISO_A3 ||
        feature.properties?.name;

      const id = rawId && rawId !== '-99' ? String(rawId) : `region-${index}`;

      return {
        id,
        path: pathGenerator(feature) || '',
      };
    });
  }, []);

  const toggleCountryColor = (regionId: string) => {
    setCountryColors(prev => ({
      ...prev,
      [regionId]: prev[regionId] === '#3498db' ? '#d3d3d3' : '#3498db',
    }));
  };

  const handleCountrySelect = (item: CountryResult) => {
    router.push({
      pathname: '../(countries)/[id]', // adjust to your actual router path
      params: {
        code: item.cca3,
        name: item.name.common,
        flag: item.flag,
        flagUrl: item.flags?.png || '',
        region: item.region,
        capital: item.capital?.[0] || '',
        population: String(item.population || 0), // Convert to string for expo-router params
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
            <Text style={styles.nameText}>{userName || 'Traveler'}</Text>
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

          <View style={[styles.searchWrapper, { zIndex: 1000, elevation: 1000 }]}>
            {/* Your existing Search TextInput/Bar */}
            {/* SEARCH BAR */}
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
          <View style={styles.mapWrapper}>
            <Svg height="100%" width="100%" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
              {formattedRegions.map((region) => {
                if (!region.path) return null;

                return (
                  <Path
                    key={region.id}
                    d={region.path}
                    fill={countryColors[region.id] || '#d3d3d3'}
                    stroke="#ffffff"
                    strokeWidth="0.5"
                    onPress={() => toggleCountryColor(region.id)}
                  />
                );
              })}
            </Svg>
          </View>

          {/* % Explored Badge */}
          <View style={styles.exploredBadge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>{MOCK_SESSION.exploredPercentage}% Explored</Text>
          </View>
        </View>

        {/* STATS SECTION */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={[styles.statBox, styles.statBoxBlue]}>
            <Text style={[styles.statNumber, styles.textBlue]}>{MOCK_CLOUD_DATA.stats.countries}</Text>
            <Text style={styles.statLabel}>Countries</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statBox, styles.statBoxGreen]}
            onPress={() => router.push('../subtabs/Cities')}
          >
            <Text style={[styles.statNumber, styles.textGreen]}>{MOCK_CLOUD_DATA.stats.cities}</Text>
            <Text style={styles.statLabel}>Cities</Text>
          </TouchableOpacity>

          <View style={[styles.statBox, styles.statBoxWhite]}>
            <Text style={styles.statNumber}>{MOCK_CLOUD_DATA.stats.continents}</Text>
            <Text style={styles.statLabel}>Continents</Text>
          </View>
        </View>

        {/* RECENT ACTIVITY */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {MOCK_CLOUD_DATA.recentActivity.map((activity) => (
          <TouchableOpacity key={activity.id} style={styles.activityCard}>
            <Image source={{ uri: activity.image }} style={styles.activityImage} />
            <View style={styles.activityInfo}>
              <View style={styles.activityLocation}>
                <Text style={styles.cityText}>🇯🇵 {activity.city}</Text>
                <Text style={styles.countryText}>{activity.country}</Text>
              </View>
              <Text style={styles.dateText}>{activity.date}</Text>
            </View>
          </TouchableOpacity>
        ))}

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
    fontWeight: 'bold',
    color: '#1a1a24',
    marginTop: 4,
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
    fontWeight: 'bold',
    color: '#1a1a24',
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
  cityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a24',
    marginBottom: 4,
  },
  countryText: {
    fontSize: 14,
    color: '#666',
  },
  dateText: {
    fontSize: 13,
    color: '#999',
  },
});