import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sharedStyles } from '../styles';

// Import your Firestore instance and query methods

export default function Phone() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    uid?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    photoURL?: string;
    code?: string;
  }>();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Simple validation check
  const isPhoneValid = phoneNumber.replace(/\D/g, '').length >= 10;

    const handlePhoneSubmission = async () => {
    if (!isPhoneValid) return;
    setLoading(true);
    setErrorMessage('');

    try {
        const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
        const functions = getFunctions();
        const checkAvailability = httpsCallable<{ phoneNumber: string }, { phoneNumberAvailable: boolean }>(
        functions,
        'checkAvailability'
        );

        const result = await checkAvailability({ phoneNumber: fullPhoneNumber });

        if (!result.data.phoneNumberAvailable) {
        setErrorMessage('There is already an account with this phone number.');
        setLoading(false);
        return;
        }

        setLoading(false);
        router.push({
        pathname: '/VerifyPhone',
        params: { 
            ...params,
            phoneNumber, 
            countryCode 
        },
        });
    } catch (error: any) {
        setLoading(false);
        setErrorMessage('An error occurred while verifying the phone number.');
    }
    };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top Navigation / Back Button */}
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
        style={styles.content}
      >
        {/* Header Text Section */}
        <View style={styles.textSection}>
          <Text style={sharedStyles.title}>Get Started</Text>
          <Text style={sharedStyles.subtitle}>Enter your phone number</Text>
        </View>

        {/* Phone Input Row */}
        <View
          style={[
            styles.inputRowContainer,
            errorMessage ? styles.inputRowError : null,
          ]}
        >
          {/* Country Code Selector */}
          <TouchableOpacity style={styles.countryPicker} activeOpacity={0.7}>
            <Text style={styles.countryCodeText}>{countryCode}</Text>
            <Ionicons name="chevron-down" size={16} color="#5C6B73" />
          </TouchableOpacity>

          {/* Text Input */}
          <TextInput
            style={styles.phoneInput}
            placeholder="Phone number"
            placeholderTextColor="#8E9AA0"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={(text) => {
              setPhoneNumber(text);
              if (errorMessage) setErrorMessage(''); // Clear error when typing
            }}
            maxLength={15}
          />
        </View>

        {/* Error Text Message */}
        {!!errorMessage && (
          <Text style={sharedStyles.bannerErrorText}>{errorMessage}</Text>
        )}

        {/* Disclaimer / Terms Text */}
        <Text style={styles.disclaimerText}>
          To verify your identity, we will send a code to your phone number.
        </Text>
      </KeyboardAvoidingView>

      {/* Submit Button Section */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            sharedStyles.button,
            isPhoneValid ? sharedStyles.submitButtonActive : sharedStyles.submitButtonDisabled,
          ]}
          onPress={handlePhoneSubmission}
          disabled={!isPhoneValid || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              style={[
                sharedStyles.buttonText,
                isPhoneValid ? sharedStyles.buttonTextActive : sharedStyles.buttonTextDisabled,
              ]}
            >
              Submit
            </Text>
          )}
        </TouchableOpacity>

        {/* Subtitle Login Link */}
        <TouchableOpacity
          style={styles.loginLinkContainer}
          onPress={() => router.replace('/Login')} // Adjust path to your login screen
          activeOpacity={0.7}
        >
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginTextBold}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3FBF7',
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    marginTop: 32,
  },
  textSection: {
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  inputRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#0D1B2A',
    paddingBottom: 8,
    marginBottom: 8,
  },
  inputRowError: {
    borderBottomColor: '#D90429',
    borderBottomWidth: 2,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    gap: 4,
  },
  countryCodeText: {
    fontSize: 18,
    color: '#0D1B2A',
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    fontSize: 18,
    color: '#0D1B2A',
    paddingVertical: 0,
  },
  disclaimerText: {
    fontSize: 13,
    color: '#8E9AA0',
    lineHeight: 18,
    marginTop: 8,
  },
  buttonContainer: {
    width: '100%',
    paddingBottom: 20,
    alignItems: 'center',
  },
  loginLinkContainer: {
    marginTop: 16,
    paddingVertical: 4,
  },
  loginText: {
    fontSize: 14,
    color: '#5C6B73',
  },
  loginTextBold: {
    fontWeight: '700',
    color: '#0D1B2A',
  },
});