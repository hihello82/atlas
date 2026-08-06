import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { getAdditionalUserInfo, GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // Import Firestore functions
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../../config/firebaseConfig'; // Import your db (Firestore instance)

export default function Login() {
  const router = useRouter();

  // Form Field States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasProviderError, setHasProviderError] = useState(false);

  // Configure Google Sign-In
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '590334508658-m0hjp221cde13m1c51ae2slacvp58tp8.apps.googleusercontent.com',
      iosClientId: '590334508658-6bhi602t4h1qho8q241oq2a3qtmhqjiq.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  const [isEmailValid, setIsEmailValid] = useState(true);
  const isEmailFormatValid = /\S+@\S+\.\S+/.test(identifier);

  const isFormFilled =
    identifier.trim().length > 0 &&
    isEmailFormatValid &&
    password.length > 0;

  // Debounced Email Validation (500ms delay after typing stops)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (identifier.trim().length > 0) {
        setIsEmailValid(isEmailFormatValid);
      } else {
        setIsEmailValid(true); // reset if field is empty
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [identifier]);

  const showEmailError = identifier.trim().length > 0 && !isEmailValid;

  // Handles Email + Password login using Firebase Auth, then verifies Firestore doc by UID
  const handleLogin = async () => {
      if (!isFormFilled) return;

      setLoading(true);
      setErrorMessage(null);
      setHasProviderError(false);

      try {
        const cleanEmail = identifier.trim();

        // 1. Authenticate with Firebase Auth first
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const user = userCredential.user;

        // 2. Safely fetch the user's document directly using their UID
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          // Account exists in Firestore -> navigate to HomeScreen
          router.replace('/HomeScreen');
        } else {
          // User is authenticated but missing a Firestore profile -> route to completion screen
          router.replace({
            pathname: '/Phone',
            params: {
              email: user.email || '',
              uid: user.uid,
              code: 'incompleteProfile',
            },
          });
        }
      } catch (error: any) {
        console.log('Login error:', error);

        if (error.code === 'auth/account-exists-with-different-credential') {
          setHasProviderError(true);
          setErrorMessage('An account already exists with a different sign-in method.');
        } else if (
          error.code === 'auth/invalid-credential' ||
          error.code === 'auth/user-not-found' ||
          error.code === 'auth/wrong-password'
        ) {
          setErrorMessage('Your credentials did not match. Please try again.');
        } else if (error.code === 'auth/invalid-email') {
          setErrorMessage('Please enter a valid email address.');
        } else {
          setErrorMessage(error.message || 'An error occurred while logging in.');
        }
      } finally {
        setLoading(false);
      }
    };

  const handleAppleLogin = async () => {
    try {
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

      console.log('Apple Sign-In Success:', credential);
      router.replace('/HomeScreen');
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('User canceled Apple Sign-In');
      } else {
        console.error('Apple Sign-In Error:', error);
        Alert.alert('Sign In Failed', 'Apple Sign-In was unsuccessful. Please try again.');
      }
    }
  };

  // Handles Google Sign-In and Firestore email existence check
    const handleGoogleLogin = async () => {
    try {
        if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        }

        const response = await GoogleSignin.signIn();
        const idToken = response.data?.idToken || (response as any).idToken;

        if (!idToken) throw new Error('Failed to retrieve Google ID token.');

        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        const user = userCredential.user;

        // Check if this is a brand new account or an existing one
        const additionalUserInfo = getAdditionalUserInfo(userCredential);

        if (additionalUserInfo?.isNewUser) {
        // New account: Push to onboarding and pass Google's provided data

            // Cast profile to safely access given_name and family_name as strings
            const profile = additionalUserInfo?.profile as
            | { given_name?: string; family_name?: string }
            | undefined;

            const userFirstName =
            profile?.given_name || user.displayName?.split(' ')[0] || '';
            const userLastName =
            profile?.family_name ||
            user.displayName?.split(' ').slice(1).join(' ') ||
            '';

            router.push({
                pathname: '/Phone',
                params: {
                uid: user.uid,
                email: user.email || '',
                firstName: userFirstName,
                lastName: userLastName,
                photoURL: user.photoURL || '',
                code: 'incompleteGoogleProfile',
                }
            });
        } else {
        // Existing account: Send directly to Home Screen
        router.replace('/HomeScreen');
        }
    } catch (error: any) {
        if (
        error.code !== statusCodes.SIGN_IN_CANCELLED &&
        !error.message?.includes('cancelled')
        ) {
        Alert.alert('Sign-Up Failed', error.message || 'Google Sign-Up was unsuccessful.');
        }
    }
    };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/Home')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Text Section */}
          <View style={styles.textSection}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Enter your details below to continue</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Email or Phone Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  (showEmailError || hasProviderError) && styles.inputError,
                ]}
                placeholder="Email Address"
                placeholderTextColor="#8E9AA0"
                keyboardType="email-address"
                autoCapitalize="none"
                value={identifier}
                onChangeText={(text) => {
                  setIdentifier(text);
                  if (hasProviderError) setHasProviderError(false);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
              {showEmailError && (
                <Text style={styles.fieldErrorText}>Please enter a valid email address.</Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#8E9AA0"
                secureTextEntry
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
            </View>
          </View>

          {/* Login Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                isFormFilled && !loading ? styles.submitButtonActive : styles.submitButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={!isFormFilled || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.buttonText,
                    isFormFilled ? styles.buttonTextActive : styles.buttonTextDisabled,
                  ]}
                >
                  Log In
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Error Text Display */}
          {errorMessage && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}

          {/* Horizontal Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Log-In Buttons Row */}
          <View style={styles.socialRow}>
            {/* Google Button */}
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleLogin}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-google" size={24} color="#0D1B2A" />
            </TouchableOpacity>

            {/* Apple Button */}
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleAppleLogin}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-apple" size={24} color="#0D1B2A" />
            </TouchableOpacity>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.signUpLinkContainer}
          onPress={() => router.replace('/Login')} // Adjust path to your login screen
          activeOpacity={0.7}
        >
          <Text style={styles.signUpText}>
            Not on Atlas yet? <Text style={styles.signUpTextBold}>Sign up</Text>
          </Text>
        </TouchableOpacity>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3FBF7',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    width: '100%',
    paddingTop: 8,
    alignItems: 'flex-start',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 120,
    flexGrow: 1,
  },
  textSection: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Playfair Display',
    letterSpacing: 1,
    color: '#0D1B2A',
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#5C6B73',
    fontWeight: '400',
  },
  formContainer: {
    gap: 16,
    marginBottom: 24,
  },
  inputContainer: {
    width: '100%',
  },
  input: {
    fontSize: 16,
    color: '#0D1B2A',
    borderBottomWidth: 1,
    borderBottomColor: '#0D1B2A',
    paddingVertical: 8,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 20,
  },
  button: {
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  submitButtonDisabled: {
    backgroundColor: '#9DAEAA',
  },
  submitButtonActive: {
    backgroundColor: '#0A111E',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#FFFFFF',
  },
  buttonTextActive: {
    color: '#FFFFFF',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#C5D3CE',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: '#5C6B73',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E8E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  signUpLinkContainer: {
    marginTop: 16,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 14,
    color: '#5C6B73',
  },
  signUpTextBold: {
    fontWeight: '700',
    color: '#0D1B2A',
  },
  errorText: {
    color: '#D90429',
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  inputError: {
    borderBottomColor: '#D90429',
    borderBottomWidth: 2,
  },
  fieldErrorText: {
    color: '#D90429',
    fontSize: 12,
    marginTop: 4,
  },
});