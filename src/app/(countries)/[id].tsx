import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PROXY_URL } from '../../../config/config';

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

  // Safely extract and format currencies and languages from the API data
  const currencies = details?.currencies
    ? Object.values(details.currencies)
        .map((c: any) => (c.symbol ? `${c.name} (${c.symbol})` : c.name))
        .join(', ')
    : undefined;

  const languages = details?.languages
    ? Object.values(details.languages).join(', ')
    : undefined;

  const infoRows = details
  ? [
      { label: 'Capital', value: params.capital },
      { label: 'Population', value: Number(params.population).toLocaleString?.() || params.population },
      { label: 'Currencies', value: currencies },
      { label: 'Languages', value: languages },
      { label: 'Subregion', value: details.subregion },
      { label: 'Area', value: details.area?.kilometers ? `${details.area.kilometers.toLocaleString()} km²` : undefined },
      { label: 'Government', value: details.government_type },
      { label: 'Landlocked', value: details.landlocked ? 'Yes' : 'No' },
      { label: 'Continent', value: details.continents?.join(', ') },
      { label: 'Demonym', value: details.demonyms?.eng?.m },
      { label: 'Driving Side', value: details.cars?.driving_side },
      { label: 'Calling Code', value: details.calling_codes?.map((c: string) => `+${c}`).join(', ') },
      { label: 'Timezones', value: details.timezones?.join(', ') },
      { label: 'Internet TLD', value: details.tlds?.join(', ') },
      { label: 'UN Member', value: details.classification?.un_member ? 'Yes' : 'No' },
      { label: 'Bordering Countries', value: details.borders?.join(', ') || 'None' },
      { label: 'Coordinates', value: details.coordinates ? `${details.coordinates.lat}, ${details.coordinates.lng}` : undefined },
    ].filter((row) => row.value !== undefined && row.value !== '' && row.value !== null)
  : [];

  // Fetch complete details by country code (alpha 3)
  useEffect(() => {
    if (!params.code) return;

    fetch(`${PROXY_URL}?q=${encodeURIComponent(params.code)}`)
      .then((res) => res.json())
      .then((resData) => {
        const objects = resData?.data?.objects || [];
        const match =
          objects.find((c: any) => c.codes?.alpha_3 === params.code) || objects[0];
        setDetails(match || null);
      })
      .catch((err) => console.error('Failed to fetch country details via proxy:', err))
      .finally(() => setLoading(false));
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