import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VerifyPhone() {
  // Extract parameters passed from the previous screen
  const { phoneNumber, countryCode } = useLocalSearchParams<{
    phoneNumber: string;
    countryCode?: string;
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
    // Placeholder for validating code with Firebase
    console.log('Firebase: Verifying OTP Code...', otp.join(''));
    router.push('/SignUp')
    // router.push('/NextScreen');
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
          <Text style={styles.title}>Enter OTP Verification Code</Text>
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
            styles.button,
            isOtpComplete ? styles.submitButtonActive : styles.submitButtonDisabled,
          ]}
          onPress={handleNextSubmission}
          disabled={!isOtpComplete}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.buttonText,
              isOtpComplete ? styles.buttonTextActive : styles.buttonTextDisabled,
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
    marginBottom: 40,
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
    borderColor: '#0A111E', // Darkens the border once filled
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
  timerText: {
    fontWeight: '400',
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
    backgroundColor: '#9DAEAA', // Matches the grayed-out state from the original prompt
  },
  submitButtonActive: {
    backgroundColor: '#0A111E', // ATLAS primary dark style
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