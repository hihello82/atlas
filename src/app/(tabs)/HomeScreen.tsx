import { Ionicons } from '@expo/vector-icons';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { db } from '../../../config/firebaseConfig';
import { useUser } from '../context/UserContext';
import { colors, sharedStyles } from '../styles';

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

const MAP_WIDTH = 360;
const MAP_HEIGHT = 210;

export default function HomeScreen() {
  const router = useRouter();

  // Pull profile state and visited map data directly from UserContext
  const { userProfile, visitedCountryCodes, exploredPercentage } = useUser();

  // Search variables
  const [searchQuery, setSearchQuery] = useState('');
  const [allCountries, setAllCountries] = useState<CountryResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch global country reference data for Search functionality
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
        pathname: '/(countries)/[id]',
        params: {
          id: item.cca3,
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
    <SafeAreaView style={sharedStyles.appContainer}>
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
            <TouchableOpacity style={sharedStyles.backButton}>
              <Ionicons name="notifications-outline" size={24} color="black" />
            </TouchableOpacity>
            <TouchableOpacity style={sharedStyles.backButton}>
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
                    fill={visitedCountryCodes[region.id] || '#d3d3d3'}
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
{/* STATS SECTION */}
<View style={styles.statsContainer}>
  <TouchableOpacity
    style={[styles.statBox, styles.statBoxPurple]}
    onPress={() =>
      router.push({
        pathname: '/MapScreen',
        params: { section: 'Trips' },
      })
    }
  >
    <Text style={[styles.statNumber, styles.textPurple]}>
      {userProfile?.stats?.trips ?? 0}
    </Text>
    <Text style={styles.statLabel}>Trips</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.statBox, styles.statBoxBlue]}
    onPress={() =>
      router.push({
        pathname: '/MapScreen',
        params: { section: 'Visited' },
      })
    }
  >
    <Text style={[styles.statNumber, styles.textBlue]}>
      {userProfile?.stats?.countriesVisited ?? 0}
    </Text>
    <Text style={styles.statLabel}>Countries</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.statBox, styles.statBoxGreen]}
    onPress={() => router.push('/subtabs/Cities')}
  >
    <Text style={[styles.statNumber, styles.textGreen]}>
      {userProfile?.stats?.citiesVisited ?? 0}
    </Text>
    <Text style={styles.statLabel}>Cities</Text>
  </TouchableOpacity>
</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchWrapper: { position: 'relative', zIndex: 1000, elevation: 1000, marginBottom: 16 },
  searchSectionContainer: { position: 'relative', zIndex: 1000, elevation: 1000 },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#e1e8ee' },
  container: { padding: 20, paddingBottom: 40 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  welcomeText: { fontSize: 16, color: colors.subtitleGray },
  nameText: { fontSize: 28, fontFamily: 'Playfair Display', fontWeight: '700', letterSpacing: 0.7, color: colors.titleDark, marginTop: -2 },
  headerIcons: { flexDirection: 'row', gap: 10 },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 28, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, height: 52 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#2c3e50', height: '100%' },
  clearButton: { padding: 4 },
  searchResultsContainer: { position: 'absolute', top: 58, left: 0, right: 0, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, zIndex: 2000 },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  spinner: { marginRight: 8 },
  resultFlag: { fontSize: 20, marginRight: 12 },
  resultTextContainer: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  resultSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  mapCard: { backgroundColor: '#f0f3f5', borderRadius: 20, padding: 0, marginBottom: 20, height: 200, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  mapWrapper: { width: '100%', height: '100%' },
  exploredBadge: { position: 'absolute', bottom: 20, left: 20, backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  badgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#007aff', marginRight: 8 },
  badgeText: { fontSize: 14, fontWeight: '600', color: '#333' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  statBox: { flex: 1, padding: 15, borderRadius: 16, marginHorizontal: 4, borderWidth: 1, borderColor: '#eee' },
  statBoxBlue: { backgroundColor: '#eef6ff', borderColor: '#d0e5ff' },
  statBoxGreen: { backgroundColor: '#eeffee', borderColor: '#dcf4dc' },
  statBoxWhite: { backgroundColor: '#fff' },
  statBoxPurple: { backgroundColor: '#f3e8ff', borderColor: '#e9d5ff' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#1a1a24', marginBottom: 4 },
  textBlue: { color: '#007aff' },
  textGreen: { color: '#34c759' },
  textPurple: { color: '#9333ea' },
  statLabel: { fontSize: 12, color: '#666' },
});