import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CountryDetailScreen() {
  const router = useRouter();
  const { id, name, flag, continent } = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      
      <View style={styles.content}>
        <Text style={styles.flag}>{flag}</Text>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.subtitle}>{continent} • {id}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  backButton: { paddingVertical: 10 },
  backText: { fontSize: 16, color: '#007aff' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  flag: { fontSize: 64, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a24' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 8 },
});