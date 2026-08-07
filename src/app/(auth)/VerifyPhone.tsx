import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Alert, KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native'; // Added Alert for error handling
import { SafeAreaView } from 'react-native-safe-area-context';
import { sharedStyles } from '../styles';


export default function VerifyPhone() {
  // Extract parameters passed from the previous screen
  const { phoneNumber, countryCode, uid, email, firstName, lastName, photoURL, code } = useLocalSearchParams<{
    phoneNumber: string;
    countryCode?: string;
    uid?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    photoURL?: string;
    code?: string;
  }>();

  // Fallback defaults if accessed directly or missing
  const formattedPhone = phoneNumber || '';
  const formattedCountry = countryCode || '+1';
    
  const router = useRouter();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(60);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const isOtpComplete = otp.every((digit) => digit.trim() !== '');

  // Placeholder: Send OTP via Firebase on component mount
  useEffect(() => {
    sendOTPFromFirebase();
  }, []);

  // Timer countdown logic
  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [timeLeft]);

  // Placeholders for Firebase logic
  const sendOTPFromFirebase = async () => {
    console.log('Firebase: Sending OTP to phone number...');
  };

  const resendOTPFromFirebase = async () => {
    setTimeLeft(60);
    console.log('Firebase: Resending OTP to phone number...');
  };

  const handleOtpChange = (text: string, index: number) => {
    // Handle iOS SMS autofill or manual copy/paste into the first box
    if (text.length > 1) {
      const newOtpChars = text.replace(/\D/g, '').slice(0, 6).split('');
      const updatedOtp = [...otp];
      newOtpChars.forEach((char, i) => {
        if (index + i < 6) updatedOtp[index + i] = char;
      });
      setOtp(updatedOtp);
      
      // Auto-focus the last filled box or the final box
      const lastFilledIndex = Math.min(index + newOtpChars.length - 1, 5);
      inputRefs.current[lastFilledIndex]?.focus();
      return;
    }

    // Standard typing of a single digit
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-advance to the next box
    if (text !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Auto-retreat to the previous box on backspace if current box is empty
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

const handleNextSubmission = async () => {
  if (!isOtpComplete) return;

  try {
    // 1. Verify OTP code with Firebase here if needed
    console.log('Firebase: Verifying OTP Code...', otp.join(''));

    // 2. Handle Google flow if the profile was incomplete
    if (code === 'incompleteGoogleProfile') {
        router.push({
            pathname: '/UsernameOnboarding',
            params: {
            uid: uid,
            email: email || '',
            firstName: firstName,
            lastName: lastName,
            photoURL: photoURL || '',
            phoneNumber: phoneNumber || '',
            countryCode: countryCode || ''
            }
        });
    } else {
      // Standard sign-up flow
      router.push({
        pathname: '/SignUp',
        params: { phoneNumber, countryCode },
      });
    }
  } catch (error: any) {
    console.error('Error saving user to Firestore:', error);
    Alert.alert('Error', 'Failed to update profile. Please try again.');
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
          <Text style={sharedStyles.title}>Enter OTP Verification Code</Text>
          <Text style={styles.subtitle}>Verification code has been sent to</Text>
          <Text style={styles.boldPhoneText}>
            ({countryCode}) {phoneNumber}
          </Text>
        </View>

        {/* OTP Input Boxes */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpBox,
                digit ? styles.otpBoxFilled : styles.otpBoxEmpty,
              ]}
              keyboardType="number-pad"
              maxLength={6} // Allowing longer length on individual input handles the iOS auto-fill paste event
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              textContentType="oneTimeCode" // Enables iOS SMS autofill natively
              autoComplete="sms-otp" // Enables Android SMS autofill
            />
          ))}
        </View>

        {/* Resend Section */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the verification code? </Text>
            <TouchableOpacity
            onPress={resendOTPFromFirebase}
            activeOpacity={0.7}
            disabled={timeLeft !== 0}
            >
            <Text
                style={[
                styles.resendButtonText,
                timeLeft !== 0 && { opacity: 0.5 }
                ]}
            >
                Resend {timeLeft !== 0 && <Text>({timeLeft}s)</Text>}
            </Text>
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Submit / Next Button Section */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            sharedStyles.button,
            isOtpComplete ? sharedStyles.submitButtonActive : sharedStyles.submitButtonDisabled,
          ]}
          onPress={handleNextSubmission}
          disabled={!isOtpComplete}
          activeOpacity={0.8}
        >
          <Text
            style={[
              sharedStyles.buttonText,
              isOtpComplete ? sharedStyles.buttonTextActive : sharedStyles.buttonTextDisabled,
            ]}
          >
            Next
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
    marginBottom: 40,
  },
  subtitle: {
    fontSize: 15,
    color: '#5C6B73',
    fontWeight: '400',
    marginBottom: 4,
  },
  boldPhoneText: {
    fontSize: 15,
    color: '#0D1B2A',
    fontWeight: '700',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    color: '#0D1B2A',
    backgroundColor: '#FFFFFF',
  },
  otpBoxEmpty: {
    borderColor: '#C3D0CA',
  },
  otpBoxFilled: {
    borderColor: '#0A111E',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  resendText: {
    fontSize: 13,
    color: '#5C6B73',
  },
  resendButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  buttonContainer: {
    width: '100%',
    paddingBottom: 20,
  },
});