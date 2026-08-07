import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../../config/firebaseConfig';
// Import your local GeoJSON data
import geoJsonData from '../../../assets/custom.geo.json';
import { colors, sharedStyles } from '../styles';

export default function CountryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code: string;
    name: string;
    flag: string;
    flagUrl: string;
    region: string;
    capital: string;
    population: string;
  }>();

  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check if the current country code exists in the GeoJSON
  // Assumes your GeoJSON uses properties.iso_a3 or properties.adm0_a3 for 3-letter codes
  const isCountryInGeoJson = geoJsonData.features.some(
    (feature: any) => 
      feature.properties?.iso_a3 === params.code || 
      feature.properties?.adm0_a3 === params.code
  );

  const rawPopulation = details?.population ?? params.population;
  const parsedPopulation =
    rawPopulation !== undefined && !isNaN(Number(rawPopulation))
      ? Number(rawPopulation).toLocaleString()
      : undefined;

  const currencies = details?.currencies
    ? Object.values(details.currencies)
        .map((c: any) => (c.symbol ? `${c.name} (${c.symbol})` : c.name))
        .join(', ')
    : undefined;

  const languages = details?.languages
    ? Object.values(details.languages).join(', ')
    : undefined;

  const infoRows = [
    { label: 'Capital', value: details?.capital ? (Array.isArray(details.capital) ? details.capital.join(', ') : details.capital) : params.capital },
    { label: 'Population', value: parsedPopulation },
    { label: 'Currencies', value: currencies },
    { label: 'Languages', value: languages },
    { label: 'Subregion', value: details?.subregion },
    { label: 'Area', value: details?.area ? `${Number(details.area).toLocaleString()} km²` : undefined },
    { label: 'Landlocked', value: details?.landlocked !== undefined ? (details.landlocked ? 'Yes' : 'No') : undefined },
    { label: 'Continent', value: Array.isArray(details?.continents) ? details.continents.join(', ') : details?.continents },
    { label: 'Demonym', value: details?.demonyms?.eng?.m || details?.demonym },
    { label: 'Driving Side', value: details?.car?.side || details?.cars?.driving_side },
    { label: 'Calling Code', value: details?.idd?.root ? `${details.idd.root}${details.idd.suffixes?.[0] || ''}` : undefined },
    { label: 'Timezones', value: Array.isArray(details?.timezones) ? details.timezones.join(', ') : undefined },
    { label: 'Internet TLD', value: Array.isArray(details?.tld) ? details.tld.join(', ') : undefined },
    { label: 'UN Member', value: details?.unMember !== undefined ? (details.unMember ? 'Yes' : 'No') : undefined },
    { label: 'Bordering Countries', value: Array.isArray(details?.borders) && details.borders.length > 0 ? details.borders.join(', ') : undefined },
  ].filter((row) => row.value !== undefined && row.value !== '' && row.value !== null);

  useEffect(() => {
    if (!params.code) return;

    const fetchCountryDetail = async () => {
      try {
        const docRef = doc(db, 'app_data', 'countries');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const rawData = docSnap.data().countries || docSnap.data().data || [];
          const countriesList = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

          const match = countriesList.find(
            (c: any) => (c.cca3 || c.codes?.alpha_3) === params.code
          );

          setDetails(match || null);
        }
      } catch (err) {
        console.error('Failed to fetch country detail from Firestore:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCountryDetail();
  }, [params.code]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={sharedStyles.header}>
        <TouchableOpacity style={sharedStyles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          {params.flagUrl ? (
            <Image source={{ uri: params.flagUrl }} style={styles.flagImage} resizeMode="cover" />
          ) : (
            <Text style={styles.flagEmoji}>{params.flag}</Text>
          )}
          <Text style={styles.title}>{params.name}</Text>
          <Text style={styles.subtitle}>{params.region}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#007aff" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.infoGrid}>
            {infoRows.map((row) => (
              <View key={row.label} style={styles.infoCard}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Add Country Button if valid match is found in GeoJSON */}
      {isCountryInGeoJson && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push({
              pathname: '../subtabs/addTrip', // Replace with your target screen path
              params: { code: params.code, name: params.name }
            })}
          >
            <Text style={styles.addButtonText}>Add New Visit</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.appBackground, paddingHorizontal: 24, paddingVertical: 20 },
  content: { padding: 20, paddingBottom: 100 },
  header: { alignItems: 'center', marginBottom: 24 },
  flagImage: { width: 120, height: 80, borderRadius: 8, marginBottom: 12 },
  flagEmoji: { fontSize: 64, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 800, color: '#1a1a24', fontFamily: 'Playfair Display' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  infoGrid: { gap: 12 },
  infoCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  infoLabel: { fontSize: 13, color: '#64748b', fontWeight: '500', marginBottom: 4 },
  infoValue: { fontSize: 16, color: '#1e293b', fontWeight: '600' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(248, 249, 250, 0.95)', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  addButton: { backgroundColor: '#007aff', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});