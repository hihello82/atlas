import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

// Import your GeoJSON data
import geoJsonData from '../../../assets/custom.geo.json';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Larger base canvas dimensions for interactive detailed view
const MAP_HEIGHT = SCREEN_HEIGHT * 0.9;
const MAP_WIDTH = SCREEN_HEIGHT * 1.8;

export default function MapScreen() {
  const [countryColors, setCountryColors] = useState<Record<string, string>>({});

  const formattedRegions = useMemo(() => {
    if (!geoJsonData || !geoJsonData.features) return [];

    const projection = geoNaturalEarth1()
      .fitSize([MAP_WIDTH, MAP_HEIGHT], geoJsonData as any);

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
    setCountryColors((prev) => ({
      ...prev,
      [regionId]: prev[regionId] === '#3498db' ? '#d3d3d3' : '#3498db',
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Outer ScrollView handles Vertical Panning & Pinch Zoom */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        minimumZoomScale={1}
        maximumZoomScale={5}
        bouncesZoom={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Inner ScrollView handles Horizontal Panning */}
        <ScrollView
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
        </ScrollView>
      </ScrollView>
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
});