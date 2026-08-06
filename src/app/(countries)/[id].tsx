import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../../config/firebaseConfig';

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

  // Parse population safely from either Firestore details or route params
  const rawPopulation = details?.population ?? params.population;
  const parsedPopulation =
    rawPopulation !== undefined && !isNaN(Number(rawPopulation))
      ? Number(rawPopulation).toLocaleString()
      : undefined;

  // Extract currencies and languages matching REST Countries schemas
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

          // Match country by cca3 or fallback code
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
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#1a1a24" />
      </TouchableOpacity>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  backButton: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  content: { padding: 20 },
  header: { alignItems: 'center', marginBottom: 24 },
  flagImage: { width: 120, height: 80, borderRadius: 8, marginBottom: 12 },
  flagEmoji: { fontSize: 64, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a24' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  infoGrid: { gap: 12 },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoLabel: { fontSize: 13, color: '#64748b', fontWeight: '500', marginBottom: 4 },
  infoValue: { fontSize: 16, color: '#1e293b', fontWeight: '600' },
});