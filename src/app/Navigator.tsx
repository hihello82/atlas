import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type TabName = 'Home' | 'Explore' | 'Map' | 'Friends' | 'Profile';

interface TabItem {
  name: TabName;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabItem[] = [
  { name: 'Home', activeIcon: 'home', inactiveIcon: 'home-outline' },
  { name: 'Explore', activeIcon: 'search', inactiveIcon: 'search-outline' },
  { name: 'Map', activeIcon: 'map', inactiveIcon: 'map-outline' },
  { name: 'Friends', activeIcon: 'people', inactiveIcon: 'people-outline' },
  { name: 'Profile', activeIcon: 'person', inactiveIcon: 'person-outline' },
];

export default function Navigator() {
  const [activeTab, setActiveTab] = useState<TabName>('Home');

  return (
    <View style={styles.container}>

      <BlurView tint="light" intensity={80} style={styles.blurContainer}>
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.name;
            const iconColor = isActive ? '#007AFF' : '#8E8E93';

            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.tabButton}
                activeOpacity={0.7}
                onPress={() => setActiveTab(tab.name)}
              >
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.inactiveIcon}
                  size={24}
                  color={iconColor}
                />
                <Text style={[styles.tabLabel, { color: iconColor, fontWeight: isActive ? '600' : '400' }]}>
                  {tab.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  blurContainer: {
    paddingBottom: Platform.OS === 'ios' ? 28 : 12, // Accounting for Home Indicator on iOS
    paddingTop: 10,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.5)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
  },
});