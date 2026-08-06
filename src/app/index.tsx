import AsyncStorage from '@react-native-async-storage/async-storage';
import { Href, Redirect } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore'; // 1. Added Firestore imports
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth, db } from '../../config/firebaseConfig'; // 2. Added db import

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
          console.log('first time app launch, going to home');
        } else if (user) {
          // 3. User is authenticated with Firebase Auth -> Check if Firestore profile exists
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', user.email));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            // Profile exists in Firestore -> Send to Home
            setAuthState({ isLoading: false, destination: '/(tabs)/HomeScreen' });
            console.log('user is signed in and has firestore profile, going to homescreen');
          } else {
            // Profile missing in Firestore -> Force them back to CompleteProfile
            setAuthState({ isLoading: false, destination: '/Home' });
            console.log('user is signed in but does not have firestore profile, going to home');
          }
        } else {
          // User is signed out -> Send to Login
          setAuthState({ isLoading: false, destination: '/Home' });
          console.log('user is signed out, going to home');
        }
      } catch (error) {
        // Fallback to login on error
        setAuthState({ isLoading: false, destination: '/Home' });
        console.log('error, going to home' + error);
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