import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCo-nsU497fS3hN8qYWtCdecJlXh3VelDE",
  authDomain: "atlas-504320.firebaseapp.com",
  projectId: "atlas-504320",
  storageBucket: "atlas-504320.firebasestorage.app",
  messagingSenderId: "590334508658",
  appId: "1:590334508658:ios:e13924f9f6ff764caacceb"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);