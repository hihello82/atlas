import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useEffect } from 'react';
import {
  Alert,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../../config/firebaseConfig';

export default function Login(){
  const router = useRouter();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '590334508658-m0hjp221cde13m1c51ae2slacvp58tp8.apps.googleusercontent.com', // Required for obtaining idToken (from Google Cloud / Firebase Console)
      iosClientId: '590334508658-6bhi602t4h1qho8q241oq2a3qtmhqjiq.apps.googleusercontent.com', // Optional: Needed if using iOS without GoogleService-Info.plist
      offlineAccess: true,
    });
  }, []);

  // will NOT work until i pay the greedy jews at apple so we'll have to wait and see
  const handleAppleLogin = async () => {
    try{
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Authentication Failed', 'Sign-In with Apple is currently unavailable');
        return;
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const name = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : null;
      const email = credential.email;

      console.log('Apple Sign-In Success:', {
        userToken: credential.identityToken,
        userId: credential.user,
        name,
        email,
      });
      
      router.replace('/(tabs)/HomeScreen');

    } catch (error: any) {
      // Handle user cancellation gracefully vs. actual error
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('User canceled Apple Sign-In');
      } else {
        console.error('Apple Sign-In Error:', error);
        Alert.alert('Sign In Failed', 'Apple Sign-In was unsuccessful. Please try again.');
      }
    }
  };

const handleGoogleLogin = async () => {
  try {
    // 1. Check Google Play Services (Android)
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    // 2. Prompt native Google Sign-In sheet
    const response = await GoogleSignin.signIn();
    
    // In newer library versions data is under response.data, in older under response
    const idToken = response.data?.idToken || (response as any).idToken;

    if (!idToken) {
      throw new Error('Failed to retrieve Google ID token.');
    }

    // 3. Create Firebase Credential
    const credential = GoogleAuthProvider.credential(idToken);

    // 4. SIGN IN TO FIREBASE (Missing Step!)
    const userCredential = await signInWithCredential(auth, credential);
    const firebaseUser = userCredential.user;

    console.log('Firebase Sign-In Success:', {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName,
      email: firebaseUser.email,
    });

    // 5. Navigate to your app's main screen
    router.replace('/(tabs)/HomeScreen');

  } catch (error: any) {
    if (
      error.code === statusCodes.SIGN_IN_CANCELLED || 
      error.message?.includes('cancelled')
    ) {
      console.log('User canceled Google Sign-In');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      console.log('Sign-in is already in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      Alert.alert('Error', 'Google Play Services are not available or updated on this device.');
    } else {
      console.error('Google Sign-In Error:', error);
      Alert.alert('Sign In Failed', error.message || 'Google Sign-In was unsuccessful.');
    }
  }
};

  const handleEmailLogin = () => {
    console.log('Email login pressed');
    router.replace('/(tabs)/HomeScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
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
        {/* Apple Button */}
        <TouchableOpacity
          style={[styles.button, styles.appleButton]}
          onPress={handleAppleLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.appleButtonText}>Continue with Apple</Text>
        </TouchableOpacity>

        {/* Google Button */}
        <TouchableOpacity
          style={[styles.button, styles.outlinedButton]}
          onPress={handleGoogleLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.outlinedButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Email Button */}
        <TouchableOpacity
          style={[styles.button, styles.outlinedButton]}
          onPress={handleEmailLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.outlinedButtonText}>Use email address</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3FBF7', // Light mint/pale background gradient tint
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  topSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoContainer: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: -20,
    // Soft drop shadow around circular logo
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },
  logo: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  title: {
    fontSize: 48,
    fontFamily: 'Playfair Display', // Or custom serif font like 'Playfair Display' / 'Georgia'
    letterSpacing: 4,
    color: '#0D1B2A',
    fontWeight: '500',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#5C6B73',
    fontWeight: '400',
    textAlign: 'center',
  },
  buttonContainer: {
    flex: 1,
    width: '80%',
    alignSelf: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 12,
  },
  button: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  appleButton: {
    backgroundColor: '#0A111E',
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  outlinedButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E8E5',
  },
  outlinedButtonText: {
    color: '#0A111E',
    fontSize: 16,
    fontWeight: '600',
  },
});