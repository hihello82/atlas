import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router'; // 1. Added useLocalSearchParams
import { useState } from 'react';
import {
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

export default function Phone() {
  const router = useRouter();

  // 2. Extract incoming parameters from Login (email, name, code, etc.)
  const params = useLocalSearchParams<{
    code?: string;
    email?: string;
    name?: string;
    photoUrl?: string;
    uid?: string;
  }>();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1');

  // Simple validation check (e.g., 10 digits for standard phone numbers)
  const isPhoneValid = phoneNumber.replace(/\D/g, '').length >= 10;

  const handlePhoneSubmission = async () => {
    if (!isPhoneValid) return;
    
    router.push({
        pathname: '/VerifyPhone',
        params: { 
          ...params,
          phoneNumber, 
          countryCode 
        },
    });
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
        <View style={styles.inputRowContainer}>
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
            onChangeText={setPhoneNumber}
            maxLength={15}
          />
        </View>

        {/* Disclaimer / Terms Text */}
        <Text style={styles.disclaimerText}>
          By submitting your phone number, you consent to being gay as FUCK and also to receive informational
          messages at that number from ATLAS. Message and data rates may apply.
          See our <Text style={styles.boldText}>Privacy Policy</Text> and{' '}
          <Text style={styles.boldText}>Terms of Service</Text> for more information.
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
          disabled={!isPhoneValid}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.buttonText,
              isPhoneValid ? styles.buttonTextActive : styles.buttonTextDisabled,
            ]}
          >
            Submit
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3FBF7', // Retained light mint/pale background tint
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
    fontSize: 28, // Scaled slightly down to fit the longer string gracefully
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
    marginBottom: 16,
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
  },
  boldText: {
    fontWeight: '600',
    color: '#5C6B73',
  },
  buttonContainer: {
    width: '100%',
    paddingBottom: 20,
  },
  button: {
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  submitButtonDisabled: {
    backgroundColor: '#9DAEAA', // Grayed-out state matching the reference button palette
  },
  submitButtonActive: {
    backgroundColor: '#0A111E', // Dark primary ATLAS active state
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