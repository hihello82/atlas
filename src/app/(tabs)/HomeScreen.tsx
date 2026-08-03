import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

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

// Dummy SVG Paths for demonstration (Representing 3 selectable "countries")
// To get a full world map, you would import a JSON array of SVG paths for all 195+ countries.
const MAP_REGIONS = [
  { id: 'region1', path: 'M10 10 H 90 V 90 H 10 Z' }, // Top Left Square
  { id: 'region2', path: 'M110 10 H 190 V 90 H 110 Z' }, // Top Right Square
  { id: 'region3', path: 'M60 110 H 140 V 190 H 60 Z' }, // Bottom Middle Square
];

export default function HomeScreen() {
  const router = useRouter();

  // State for map colors
  const [countryColors, setCountryColors] = useState<Record<string, string>>({});

  const toggleCountryColor = (regionId: string) => {
    setCountryColors(prev => ({
      ...prev,
      // Toggles between a colored state (blue) and default (undefined/gray)
      [regionId]: prev[regionId] === '#3498db' ? '#d3d3d3' : '#3498db'
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
              //onPress={() => router.push('/Notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color="black" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton}
              //onPress={() => router.push('/History')}
            >
              <Ionicons name="time-outline" size={24} color="black" />
            </TouchableOpacity>
          </View>
        </View>

        {/* INTERACTIVE MAP CONTAINER */}
        <View style={styles.mapCard}>
          {/* Functional 2D Map Placeholder */}
          <View style={styles.mapWrapper}>
             <Svg height="200" width="100%" viewBox="0 0 200 200">
              {MAP_REGIONS.map((region) => (
                <Path
                  key={region.id}
                  d={region.path}
                  fill={countryColors[region.id] || '#d3d3d3'} // Gray by default
                  stroke="#ffffff"
                  strokeWidth="2"
                  onPress={() => toggleCountryColor(region.id)}
                />
              ))}
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
          {/* Interactable Button 1 */}
          <TouchableOpacity style={[styles.statBox, styles.statBoxBlue]}>
            <Text style={[styles.statNumber, styles.textBlue]}>{MOCK_CLOUD_DATA.stats.countries}</Text>
            <Text style={styles.statLabel}>Countries</Text>
          </TouchableOpacity>

          {/* Interactable Button 2 */}
          <TouchableOpacity style={[styles.statBox, styles.statBoxGreen]}>
            <Text style={[styles.statNumber, styles.textGreen]}>{MOCK_CLOUD_DATA.stats.cities}</Text>
            <Text style={styles.statLabel}>Cities</Text>
          </TouchableOpacity>

          {/* Uninteractable Field */}
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
                {/* Flag placeholder using an emoji */}
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
    padding: 15,
    marginBottom: 25,
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  mapWrapper: {
    width: '100%',
    height: 200,
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