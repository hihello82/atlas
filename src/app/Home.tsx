import { useRouter } from 'expo-router';
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sharedStyles } from './styles';

export default function Home(){
  const router = useRouter();

  return (
    <SafeAreaView style={[sharedStyles.authContainer, styles.container]}>
      <StatusBar barStyle="dark-content" />

      {/* Top Branding Section */}
      <View style={styles.topSection}>
        {/* Circular Logo Wrapper */}
        <View style={styles.logoContainer}>
          <Image
            source={require('atlas/assets/logo.jpeg')} // Replace with your image path
            style={styles.logo}
            resizeMode="cover"
          />
        </View>

        {/* Title and Subtitle */}
        <Text style={styles.title}>ATLAS</Text>
        <Text style={styles.subtitle}>
          Explore the world. Track every journey.
        </Text>
      </View>

      {/* Buttons Section */}
      <View style={styles.buttonContainer}>
        {/* Log In */}
        <TouchableOpacity
          style={[styles.button, styles.appleButton]}
          onPress={() => router.push('/Login')}
          activeOpacity={0.8}
        >
          <Text style={styles.appleButtonText}>Log In</Text>
        </TouchableOpacity>

        {/* Sign Up Button */}
        <TouchableOpacity
          style={[styles.button, styles.outlinedButton]}
          onPress={() => router.push('/Phone')}
          activeOpacity={0.8}
        >
          <Text style={styles.outlinedButtonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
  },
  topSection: { alignItems: 'center', marginTop: 40 },
  logoContainer: { width: 220, height: 220, borderRadius: 110, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 20, marginTop: -20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 4 },
  logo: { width: 180, height: 180, borderRadius: 90 },
  title: { fontSize: 48, fontFamily: 'Playfair Display', letterSpacing: 4, color: '#0D1B2A', fontWeight: '500', marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#5C6B73', fontWeight: '400', textAlign: 'center' },
  buttonContainer: { flex: 1, width: '80%', alignSelf: 'center', justifyContent: 'center', marginBottom: 20, gap: 12 },
  button: { height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  appleButton: { backgroundColor: '#0A111E' },
  appleButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  outlinedButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E8E5' },
  outlinedButtonText: { color: '#0A111E', fontSize: 16, fontWeight: '600' },
});