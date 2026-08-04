import { Ionicons } from '@expo/vector-icons';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

// Import your GeoJSON data (or replace with local object)
import geoJsonData from '../../../assets/custom.geo.json';

// Mock session data
const MOCK_SESSION = {
  name: "Alex Chen",
  exploredPercentage: 12,
};

// Mock cloud data
const MOCK_CLOUD_DATA = {
  stats: {
    countries: 23,
    cities: 47,
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

  // State for map colors
  const [countryColors, setCountryColors] = useState<Record<string, string>>({});

  // Convert GeoJSON Features to SVG Paths
  const formattedRegions = useMemo(() => {
    if (!geoJsonData || !geoJsonData.features) return [];

    // Create custom projection: center slightly north and zoom in
    const projection = geoNaturalEarth1()
      .scale(70) // Increases map size to fill container
      .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2 + 10]) // Adjust vertical center
      .clipExtent([[0, 0], [MAP_WIDTH, MAP_HEIGHT]]); // Clips boundaries to frame

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
      // Toggles between blue (#3498db) and default gray (#d3d3d3)
      [regionId]: prev[regionId] === '#3498db' ? '#d3d3d3' : '#3498db',
    }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* HEADER */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.nameText}>{MOCK_SESSION.name}</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              style={styles.iconButton}
              // onPress={() => router.push('/Notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color="black" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton}
              // onPress={() => router.push('/History')}
            >
              <Ionicons name="time-outline" size={24} color="black" />
            </TouchableOpacity>
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

          <TouchableOpacity style={[styles.statBox, styles.statBoxGreen]}>
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
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
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
  mapCard: {
    backgroundColor: '#f0f3f5',
    borderRadius: 20,
    padding: 0, // Set padding to 0 so the map can stretch edge-to-edge
    marginBottom: 10,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden', // Clips any map overlap neatly at the rounded corners
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