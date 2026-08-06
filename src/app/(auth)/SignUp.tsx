import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
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
import { auth } from '../../../config/firebaseConfig';

export default function SignUp() {
  const router = useRouter();

  // Form Field States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Debounced Validation States
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [isPasswordValid, setIsPasswordValid] = useState(true);
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  // Configure Google Sign-In
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '590334508658-m0hjp221cde13m1c51ae2slacvp58tp8.apps.googleusercontent.com',
      iosClientId: '590334508658-6bhi602t4h1qho8q241oq2a3qtmhqjiq.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  // Instant Password Strength Rules Check (used for enabling the Sign Up button)
  const passwordMeetsRequirements =
    password.length >= 8 &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // Instant Email Format Check (used for enabling the Sign Up button)
  const isEmailFormatValid = /\S+@\S+\.\S+/.test(email);

  // Instant Passwords Match Check (used for enabling the Sign Up button)
  const doPasswordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  // Debounced Email Validation (500ms delay after user stops typing) - drives the error message UI
  useEffect(() => {
    const handler = setTimeout(() => {
      if (email.trim().length > 0) {
        setIsEmailValid(isEmailFormatValid);
      } else {
        setIsEmailValid(true); // reset if field is empty
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [email]);

  // Debounced Password Strength Validation (500ms delay after user stops typing) - drives the error message UI
  useEffect(() => {
    const handler = setTimeout(() => {
      if (password.length > 0) {
        setIsPasswordValid(passwordMeetsRequirements);
      } else {
        setIsPasswordValid(true); // reset if field is empty
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [password]);

  // Debounced Password Match Check (500ms delay after user stops typing) - drives the error message UI
  useEffect(() => {
    const handler = setTimeout(() => {
      if (confirmPassword.length > 0) {
        setPasswordsMatch(password === confirmPassword);
      } else {
        setPasswordsMatch(true); // reset if confirm field is empty
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [password, confirmPassword]);

  // Overall Form Validation to enable/disable "Sign Up" button.
  // Uses the instant checks (not the debounced display states) so the button can
  // never enable based on a stale "valid" value while a debounce timer is still pending.
  const isFormValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    isEmailFormatValid &&
    passwordMeetsRequirements &&
    doPasswordsMatch;

  const handleSignUp = () => {
    if (!isFormValid) return;
    router.replace('/HomeScreen');
  };

  const handleAppleLogin = async () => {
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Authentication Failed', 'Sign-Up with Apple is currently unavailable');
        return;
      }

      await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      router.replace('/HomeScreen');
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign-Up Failed', 'Apple Sign-Up was unsuccessful. Please try again.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken || (response as any).idToken;

      if (!idToken) throw new Error('Failed to retrieve Google ID token.');

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);

      router.replace('/HomeScreen');
    } catch (error: any) {
      if (
        error.code !== statusCodes.SIGN_IN_CANCELLED &&
        !error.message?.includes('cancelled')
      ) {
        Alert.alert('Sign-Up Failed', error.message || 'Google Sign-Up was unsuccessful.');
      }
    }
  };

  const showEmailError = email.trim().length > 0 && !isEmailValid;
  const showPasswordError = password.length > 0 && !isPasswordValid;
  const showMismatchError = confirmPassword.length > 0 && !passwordsMatch;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
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
            <Text style={styles.title}>Create Your Account</Text>
            <Text style={styles.subtitle}>Enter your details below to continue</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* First Name Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="First Name"
                placeholderTextColor="#8E9AA0"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>

            {/* Last Name Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                placeholderTextColor="#8E9AA0"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  showEmailError && styles.inputError,
                ]}
                placeholder="Email Address"
                placeholderTextColor="#8E9AA0"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              {showEmailError && (
                <Text style={styles.errorText}>Please enter a valid email address.</Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  (showPasswordError || showMismatchError) && styles.inputError,
                ]}
                placeholder="Password"
                placeholderTextColor="#8E9AA0"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              {showPasswordError && (
                <Text style={styles.errorText}>
                  Must be at least 8 characters long, have 1 special character and 1 number.
                </Text>
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  showMismatchError && styles.inputError,
                ]}
                placeholder="Confirm Password"
                placeholderTextColor="#8E9AA0"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              {showMismatchError && (
                <Text style={styles.errorText}>Passwords do not match.</Text>
              )}
            </View>
          </View>

          {/* Sign Up Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                isFormValid ? styles.submitButtonActive : styles.submitButtonDisabled,
              ]}
              onPress={handleSignUp}
              disabled={!isFormValid}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.buttonText,
                  isFormValid ? styles.buttonTextActive : styles.buttonTextDisabled,
                ]}
              >
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Horizontal Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Sign-Up Buttons Row */}
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
  inputError: {
    borderBottomColor: '#D90429',
  },
  errorText: {
    color: '#D90429',
    fontSize: 12,
    marginTop: 4,
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
});