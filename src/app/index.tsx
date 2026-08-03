// so it stops giving me that stupid error every time i build this app

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Href, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

type AuthState = {
  isLoading: boolean;
  destination: Href;
};

export default function Index() {
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    destination: '/LoginScreen',
  });

  useEffect(() => {
    async function checkNavigationState() {
      try {
        const isFirstTime = await AsyncStorage.getItem('hasLaunchedBefore');
        const userToken = await AsyncStorage.getItem('userToken');
        const tokenExpiry = await AsyncStorage.getItem('tokenExpiry');

        // Check if token exists and is not expired
        const now = Date.now();
        const isSessionValid = userToken && tokenExpiry && now < parseInt(tokenExpiry, 10);

        if (isFirstTime === null) {
          // First time ever opening the app
          await AsyncStorage.setItem('hasLaunchedBefore', 'true');
          setAuthState({ isLoading: false, destination: '/LoginScreen' });
        } else if (!isSessionValid) {
          // Session expired or token missing
          setAuthState({ isLoading: false, destination: '/LoginScreen' });
        } else {
          // Authenticated and valid session
          setAuthState({ isLoading: false, destination: '/(tabs)/HomeScreen' });
        }
      } catch (error) {
        // Fallback to login on error
        setAuthState({ isLoading: false, destination: '/LoginScreen' });
      }
    }

    checkNavigationState();
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
