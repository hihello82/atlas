import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useState } from 'react';
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

export default function UsernameOnboarding() {
  const router = useRouter();
  
  // Retrieve the data passed from the Google Sign-in step
  const params = useLocalSearchParams();
  const {
    uid,
    email,
    firstName,
    lastName,
    photoURL,
    phoneNumber,
    countryCode
  } = params;

  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = username.trim().length > 0;

  const handleContinue = async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setUsernameError('');

    try {
      const functions = getFunctions();

      // 1. Check if the chosen username is available
      const checkAvailability = httpsCallable<
        { username: string },
        { usernameAvailable: boolean }
      >(functions, 'checkAvailability');

      const availability = await checkAvailability({
        username: username.trim(),
      });

      if (!availability.data.usernameAvailable) {
        setUsernameError('This username is already taken. Please choose another.');
        setIsSubmitting(false);
        return;
      }

      // 2. Create the user profile with all newly added fields and Google data
      const createUserProfile = httpsCallable(functions, 'createUserProfile');
      
      await createUserProfile({
        uid,
        username: username.trim(),
        firstName,
        lastName,
        email,
        phoneNumber: phoneNumber ? `${countryCode || ''}${phoneNumber}` : null,
        countryCode: countryCode || null,
        rawPhoneNumber: phoneNumber || null,
        profilePhoto: photoURL || null,
        bio: "",
        stats: {
          countriesVisited: 0,
          citiesVisited: 0,
          trips: 0
        },
        social: {
          followers: 0,
          following: 0
        },
        settings: {
          isPrivate: false,
          notificationsEnabled: true
        },
        isGoogleSignIn: true
      });

      // 3. Success! Send the user to the app
      router.replace('/HomeScreen');

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong creating your profile.');
      setIsSubmitting(false);
    }
  };

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
            <Text style={styles.title}>Choose your username</Text>
            <Text style={styles.subtitle}>This is how other users will see you.</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  !!usernameError && styles.inputError,
                ]}
                placeholder="Username"
                placeholderTextColor="#8E9AA0"
                autoCapitalize="none"
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  if (usernameError) setUsernameError('');
                }}
                editable={!isSubmitting}
              />
              {!!usernameError && (
                <Text style={styles.errorText}>{usernameError}</Text>
              )}
            </View>
          </View>

          {/* Continue Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                isFormValid ? styles.submitButtonActive : styles.submitButtonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!isFormValid || isSubmitting}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.buttonText,
                  isFormValid ? styles.buttonTextActive : styles.buttonTextDisabled,
                ]}
              >
                {isSubmitting ? 'Creating...' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Keeping styles identical to SignUp for visual consistency
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
    marginTop: 20,
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
});