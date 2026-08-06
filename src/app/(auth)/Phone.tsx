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

// Import your Firestore instance and query methods

export default function Phone() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    code?: string;
    email?: string;
    name?: string;
    photoUrl?: string;
    uid?: string;
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
        style={styles.content}
      >
        {/* Header Text Section */}
        <View style={styles.textSection}>
          <Text style={styles.title}>Get Started</Text>
          <Text style={styles.subtitle}>Enter your phone number</Text>
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
          <Text style={styles.errorText}>{errorMessage}</Text>
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
            styles.button,
            isPhoneValid ? styles.submitButtonActive : styles.submitButtonDisabled,
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
                styles.buttonText,
                isPhoneValid ? styles.buttonTextActive : styles.buttonTextDisabled,
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
  content: {
    flex: 1,
    marginTop: 32,
  },
  textSection: {
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Playfair Display',
    letterSpacing: 1,
    color: '#0D1B2A',
    fontWeight: '700',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#5C6B73',
    fontWeight: '400',
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
    borderBottomColor: '#D90429', // Red highlight when error exists
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
  errorText: {
    color: '#D90429',
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '500',
  },
  disclaimerText: {
    fontSize: 13,
    color: '#8E9AA0',
    lineHeight: 18,
    marginTop: 8,
  },
  boldText: {
    fontWeight: '600',
    color: '#5C6B73',
  },
  buttonContainer: {
    width: '100%',
    paddingBottom: 20,
    alignItems: 'center',
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