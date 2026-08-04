import AsyncStorage from '@react-native-async-storage/async-storage';
import { Href, Redirect } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../../config/firebaseConfig';

type AuthState = {
  isLoading: boolean;
  destination: Href;
};

export default function Index() {
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    destination: '/Home',
  });

  useEffect(() => {
    // 1. Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      try {
        const isFirstTime = await AsyncStorage.getItem('hasLaunchedBefore');

        if (isFirstTime === null) {
          // First time ever opening the app -> Send to Onboarding/Login
          await AsyncStorage.setItem('hasLaunchedBefore', 'true');
          setAuthState({ isLoading: false, destination: '/Home' });
        } else if (user) {
          // User is authenticated with Firebase -> Send to Home
          setAuthState({ isLoading: false, destination: '/(tabs)/HomeScreen' });
        } else {
          // User is signed out -> Send to Login
          setAuthState({ isLoading: false, destination: '/Home' });
        }
      } catch (error) {
        // Fallback to login on error
        setAuthState({ isLoading: false, destination: '/Home' });
      }
    });

    // 2. Clean up the Firebase listener when unmounting
    return () => unsubscribe();
  }, []);

  if (authState.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Redirect href={authState.destination} />;
}