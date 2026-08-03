import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function Login(){
  const router = useRouter();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '590334508658-m0hjp221cde13m1c51ae2slacvp58tp8.apps.googleusercontent.com', // Required for obtaining idToken (from Google Cloud / Firebase Console)
      iosClientId: 'com.googleusercontent.apps.649962851864-dh91lv34fh4dh679cu9dsh6uqb7a4m4t', // Optional: Needed if using iOS without GoogleService-Info.plist
      offlineAccess: true,
    });
  }, []);

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
      
      router.replace('/Navigator');

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
      // 2. Check if Google Play Services are available (Android required)
      await GoogleSignin.hasPlayServices();

      // 3. Trigger sign-in flow
      const response = await GoogleSignin.signIn();

      if (response.type === 'success') {
        // Extract user data directly from the response
        const { email, name } = response.data.user;

        console.log('Google Sign-In Success:', {
          name,
          email,
          idToken: response.data.idToken,
        });

        // TODO: Pass response.data.idToken to your backend API here if applicable

        router.replace('/Navigator');
      } else if (response.type === 'cancelled') {
        console.log('User canceled Google Sign-In');
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User canceled Google Sign-In');
      } else {
        console.error('Google Sign-In Error:', error);
        Alert.alert('Sign In Failed', 'Google Sign-In was unsuccessful. Please try again.');
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