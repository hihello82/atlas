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
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sharedStyles } from '../styles';

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
    <SafeAreaView style={sharedStyles.authContainer}>
      <StatusBar barStyle="dark-content" />

      {/* Top Navigation Header */}
      <View style={sharedStyles.header}>
        <TouchableOpacity
          style={sharedStyles.backButton}
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
          contentContainerStyle={sharedStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Text Section */}
          <View style={sharedStyles.textSection}>
            <Text style={sharedStyles.title}>Choose your username</Text>
            <Text style={sharedStyles.subtitle}>This is how other users will see you.</Text>
          </View>

          {/* Form Fields */}
          <View style={sharedStyles.formContainer}>
            <View style={sharedStyles.inputContainer}>
              <TextInput
                style={[
                  sharedStyles.input,
                  !!usernameError && sharedStyles.inputError,
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
                <Text style={sharedStyles.fieldErrorText}>{usernameError}</Text>
              )}
            </View>
          </View>

          {/* Continue Button */}
          <View style={sharedStyles.buttonContainer}>
            <TouchableOpacity
              style={[
                sharedStyles.button,
                isFormValid ? sharedStyles.submitButtonActive : sharedStyles.submitButtonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!isFormValid || isSubmitting}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  sharedStyles.buttonText,
                  isFormValid ? sharedStyles.buttonTextActive : sharedStyles.buttonTextDisabled,
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