import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Extract the exact props type from Expo Router's Tabs component
type TabBarProps = NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>;
type CustomTabBarProps = Parameters<TabBarProps>[0];

const ICON_MAP: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  index: { active: 'home', inactive: 'home-outline' },
  explore: { active: 'search', inactive: 'search-outline' },
  map: { active: 'map', inactive: 'map-outline' },
  friends: { active: 'people', inactive: 'people-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

function CustomBlurTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  return (
    <View style={styles.container}>
      <BlurView tint="light" intensity={80} style={styles.blurContainer}>
        <View style={styles.tabBar}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = options.title !== undefined ? options.title : route.name;
            const isFocused = state.index === index;

            const icons = ICON_MAP[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
            const iconColor = isFocused ? '#007AFF' : '#8E8E93';

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tabButton}
                activeOpacity={0.7}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
              >
                <Ionicons
                  name={isFocused ? icons.active : icons.inactive}
                  size={24}
                  color={iconColor}
                />
                <Text style={[styles.tabLabel, { color: iconColor, fontWeight: isFocused ? '600' : '400' }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomBlurTabBar {...props} />}
    >
      <Tabs.Screen name="HomeScreen" options={{ title: 'Home' }} />
      <Tabs.Screen name="ExploreScreen" options={{ title: 'Explore' }} />
      <Tabs.Screen name="MapScreen" options={{ title: 'Map' }} />
      <Tabs.Screen name="FriendsScreen" options={{ title: 'Friends' }} />
      <Tabs.Screen name="ProfileScreen" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  blurContainer: {
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
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