
import { StyleSheet } from 'react-native';
 
/**
 * ============================================================
 * SHARED STYLES — Atlas App
 * ============================================================
 * Consolidated from: Home, Login, Phone, VerifyPhone, SignUp,
 * UsernameOnboarding, Cities, addTrip, [id], HomeScreen,
 * ProfileScreen, MapScreen.
 *
 * Import and spread/reuse these instead of redefining the same
 * object in every screen's local StyleSheet. See the chat
 * response this file was delivered with for a full list of
 * what was merged and a list of inconsistencies found across
 * the original files that should be reviewed/fixed.
 * ============================================================
 */
 
// ------------------------------------------------------------
// COLOR PALETTE
// ------------------------------------------------------------
export const colors = {
  // Screen backgrounds
  authBackground: '#F3FBF7', // auth-flow screens (Login, Phone, VerifyPhone, SignUp, UsernameOnboarding, Home)
  appBackground: '#f8f9fa',  // main-app screens (MapScreen, addTrip, [id], HomeScreen, ProfileScreen)
  white: '#FFFFFF',
 
  // Text
  titleDark: '#0D1B2A',      // majority title/heading + primary input text color
  subtitleGray: '#5C6B73',   // majority subtitle/secondary text color
  placeholderGray: '#8E9AA0',
  bodyDark: '#1e293b',
  mutedGray: '#64748b',
 
  // Actions / status
  primaryBlue: '#007aff',
  primaryDark: '#0A111E',    // active button background
  disabledGray: '#9DAEAA',   // disabled button background
  errorRed: '#D90429',
  successGreen: '#34c759',
 
  // Borders / dividers
  borderLight: '#E1E8E5',
  dividerLine: '#C5D3CE',
  cardBorder: '#eeeeee',
  inputBorderSlate: '#cbd5e1',
};
 
// ------------------------------------------------------------
// SHARED SHADOW — used by circular back/social buttons
// ------------------------------------------------------------
export const softShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 5,
  elevation: 2,
} as const;
 
// ------------------------------------------------------------
// SHARED STYLESHEET
// ------------------------------------------------------------
export const sharedStyles = StyleSheet.create({
  // --- Screen containers ---
  authContainer: {
    // Login, Phone, VerifyPhone, SignUp, UsernameOnboarding, Home
    flex: 1,
    backgroundColor: colors.authBackground,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  appContainer: {
    // MapScreen, addTrip, [id], HomeScreen (safeArea), ProfileScreen (safeArea)
    flex: 1,
    backgroundColor: colors.appBackground,
  },
 
  // --- Top nav header row with back button ---
  header: {
    // Login, Phone, VerifyPhone, SignUp, UsernameOnboarding, Cities
    width: '100%',
    paddingTop: 8,
    alignItems: 'flex-start',
  },
  backButton: {
    // Login, Phone, VerifyPhone, SignUp, UsernameOnboarding, Cities, addTrip
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...softShadow,
  },
 
  // --- Scroll wrapper used on form-style screens ---
  scrollContent: {
    // Login, SignUp, UsernameOnboarding, Cities
    paddingTop: 24,
    paddingBottom: 120,
    flexGrow: 1,
  },
 
  // --- Header text block (title + subtitle) ---
  textSection: {
    // Login, SignUp, UsernameOnboarding, Cities (majority use marginBottom: 20)
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    // Login, UsernameOnboarding, SignUp (majority values below)
    fontSize: 28,
    fontFamily: 'Playfair Display',
    letterSpacing: 1,
    color: colors.titleDark,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    // Login, Phone, UsernameOnboarding, SignUp, Cities
    fontSize: 16,
    color: colors.subtitleGray,
    fontWeight: '400',
  },
 
  // --- Form fields ---
  formContainer: {
    gap: 16,
    marginBottom: 24,
  },
  inputContainer: {
    width: '100%',
  },
  input: {
    fontSize: 16,
    color: colors.titleDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.titleDark,
    paddingVertical: 8,
  },
  inputError: {
    // NOTE: Login includes borderBottomWidth: 2 here; SignUp/UsernameOnboarding
    // omit it. Standardized here on the more visible version — see notes.
    borderBottomColor: colors.errorRed,
    borderBottomWidth: 2,
  },
  fieldErrorText: {
    // Small inline error under a single field.
    // (appears as "fieldErrorText" in Login, "errorText" in SignUp/UsernameOnboarding)
    color: colors.errorRed,
    fontSize: 12,
    marginTop: 4,
  },
  bannerErrorText: {
    // Larger form-level error banner (Login's "errorText", Phone's "errorText")
    color: colors.errorRed,
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
 
  // --- Primary submit button ---
  buttonContainer: {
    width: '100%',
    marginBottom: 20,
  },
  button: {
    // Login, Phone, VerifyPhone, SignUp, UsernameOnboarding
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  submitButtonDisabled: {
    backgroundColor: colors.disabledGray,
  },
  submitButtonActive: {
    backgroundColor: colors.primaryDark,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: colors.white,
  },
  buttonTextActive: {
    color: colors.white,
  },
 
  // --- "or continue with" divider ---
  dividerContainer: {
    // Login, SignUp
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.dividerLine,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: colors.subtitleGray,
  },
 
  // --- Social auth buttons ---
  socialRow: {
    // Login, SignUp
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...softShadow,
  },
 
  // --- Generic pressed-state helper ---
  pressed: {
    opacity: 0.7,
  },
});