import { onAuthStateChanged } from 'firebase/auth';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    increment,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
    writeBatch,
} from 'firebase/firestore';
import {
    deleteObject,
    getDownloadURL,
    getStorage,
    listAll,
    ref,
    uploadBytesResumable,
} from 'firebase/storage';
import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import { auth, db } from '../../../config/firebaseConfig';

export interface UserProfile {
  uid: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phoneNumber?: string | null;
  countryCode?: string | null;
  rawPhoneNumber?: string | null;
  profilePhoto?: string | null;
  bio?: string;
  homeCity?: string;
  homeCountry?: string;
  instagram?: string;
  tiktok?: string;
  stats?: {
    countriesVisited?: number;
    citiesVisited?: number;
    continentsVisited?: number;
    trips?: number;
  };
  social?: {
    followers?: number;
    following?: number;
  };
  settings?: {
    isPrivate?: boolean;
    notificationsEnabled?: boolean;
  };
  isGoogleSignIn?: boolean;
}

type StatKey = keyof NonNullable<UserProfile['stats']>;

export interface ActivityItem {
  id: string;
  title: string;
  location: string;
  dateObj: Date;
  dateString: string;
  image: string;
}

export interface TripItem {
  id: string;
  title?: string;
  description?: string;
  startDate?: any;
  endDate?: any;
  countries?: string[];
  cities?: string[];
  photos?: { url: string; caption: string }[];
  coverPhoto?: string | null;
  [key: string]: any;
}

export interface AddTripVisitParams {
  code: string;
  name: string;
  startDate?: string;
  endDate?: string;
  tripName?: string;
  notes?: string;
  selectedTripId: string;
  uploadedPhotosData: { url: string; caption: string }[];
}

interface UserContextType {
  userProfile: UserProfile | null;
  visitedCountryCodes: Record<string, string>;
  exploredPercentage: string;
  recentActivities: ActivityItem[];
  userTrips: TripItem[];
  loading: boolean;
  refreshUserProfile: () => Promise<UserProfile | null>;
  addTripVisit: (params: AddTripVisitParams) => Promise<void>;
  updateUserProfileLocal: (partial: Partial<UserProfile>) => void;
  updateUserProfileFields: (fields: Partial<UserProfile>) => Promise<void>;
  incrementUserStats: (deltas: Partial<Record<StatKey, number>>) => Promise<void>;
  updateUsername: (newUsername: string) => Promise<{ success: boolean; error?: string }>;
  uploadUserFile: (
    localUri: string,
    fileName: string,
    onProgress?: (progressPercent: number) => void,
    customPath?: string
  ) => Promise<string>;
  deleteUserFile: (fileUrlOrPath: string) => Promise<void>;
  uploadProfilePhoto: (
    localUri: string,
    onProgress?: (progressPercent: number) => void
  ) => Promise<string>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

function isPlainObject(value: unknown): value is Record<string, any> {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value as any).constructor === Object
  );
}

function flattenForFirestore(
  obj: Record<string, any>,
  parentPath = ''
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = parentPath ? `${parentPath}.${key}` : key;
    if (isPlainObject(value)) {
      Object.assign(result, flattenForFirestore(value, path));
    } else {
      result[path] = value;
    }
  }
  return result;
}

function deepMergeProfile<T extends Record<string, any>>(
  base: T,
  updates: Partial<T>
): T {
  const result: any = { ...base };
  for (const [key, value] of Object.entries(updates)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMergeProfile(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [visitedCountryCodes, setVisitedCountryCodes] = useState<Record<string, string>>({});
  const [exploredPercentage, setExploredPercentage] = useState<string>('0.00');
  const [loading, setLoading] = useState(true);

    // Add state for recent activities inside UserProvider:
    const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);

    // Helper function to format date range inside UserContext
    const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const formatDateRange = (start: any, end: any) => {
    if (!start) return '';
    const startDate = start.toDate ? start.toDate() : new Date(start);
    const endDate = end ? (end.toDate ? end.toDate() : new Date(end)) : null;

    const startMonth = startDate.toLocaleString('en-US', { month: 'long' });
    const startDay = getOrdinal(startDate.getDate());
    const startYear = startDate.getFullYear();

    if (!endDate || startDate.getTime() === endDate.getTime()) {
        return `${startMonth} ${startDay} ${startYear}`;
    }

    const endMonth = endDate.toLocaleString('en-US', { month: 'long' });
    const endDay = getOrdinal(endDate.getDate());
    const endYear = endDate.getFullYear();

    if (startYear !== endYear) {
        return `${startMonth} ${startDay} ${startYear} - ${endMonth} ${endDay} ${endYear}`;
    } else if (startMonth !== endMonth) {
        return `${startMonth} ${startDay} - ${endMonth} ${endDay} ${startYear}`;
    } else {
        return `${startMonth} ${startDay} - ${endDay} ${startYear}`;
    }
    };

    const [userTrips, setUserTrips] = useState<TripItem[]>([]);

    // Update fetchUserProfile to fetch countries and trips subcollections
    const fetchUserProfile = useCallback(async (uid: string): Promise<UserProfile | null> => {
    try {
        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const activities: ActivityItem[] = [];

        // Fetch user countries subcollection
        const countriesRef = collection(db, 'users', uid, 'countries');
        const countriesSnap = await getDocs(countriesRef);
        const colors: Record<string, string> = {};
        let visitedCount = 0;

        countriesSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const cca3 = data.countryCode || docSnap.id;
        colors[cca3] = '#3498db';
        visitedCount++;

        const recentDate = data.recentArrival || data.firstVisited || data.arrivalDate;
        const endDate = data.lastVisited || data.departureDate;

        if (recentDate) {
            const jsDate = recentDate.toDate ? recentDate.toDate() : new Date(recentDate);
            if (jsDate >= sixMonthsAgo) {
            activities.push({
                id: `country-${docSnap.id}`,
                title: `Visited ${data.countryName || docSnap.id}`,
                location: data.countryName || docSnap.id,
                dateObj: jsDate,
                dateString: formatDateRange(recentDate, endDate),
                image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80',
            });
            }
        }
        });

        // Fetch user trips subcollection
        const tripsRef = collection(db, 'users', uid, 'trips');
        const tripsSnap = await getDocs(tripsRef);
        const tripsList: TripItem[] = [];

        tripsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        tripsList.push({ id: docSnap.id, ...data } as TripItem);

        const startDate = data.startDate;
        const endDate = data.endDate;

        if (startDate) {
            const jsDate = startDate.toDate ? startDate.toDate() : new Date(startDate);
            if (jsDate >= sixMonthsAgo) {
            activities.push({
                id: `trip-${docSnap.id}`,
                title: data.title || 'Trip',
                location: data.countries?.join(', ') || 'Multiple Locations',
                dateObj: jsDate,
                dateString: formatDateRange(startDate, endDate),
                image: data.coverPhoto || 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=500&q=80',
            });
            }
        }
        });

        activities.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
        
        // Update local states
        setRecentActivities(activities);
        setUserTrips(tripsList);
        setVisitedCountryCodes(colors);
        setExploredPercentage(((visitedCount / 195) * 100).toFixed(2));

        if (snap.exists()) {
        const profile = { uid, ...(snap.data() as Omit<UserProfile, 'uid'>) };
        setUserProfile(profile);
        return profile;
        } else {
        setUserProfile(null);
        return null;
        }
    } catch (error) {
        console.error('UserContext: failed to fetch user profile/countries:', error);
        return null;
    }
    }, []);

    // Refresh handler for current logged in user
    const refreshUserProfile = useCallback(async (): Promise<UserProfile | null> => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
        setUserProfile(null);
        setVisitedCountryCodes({});
        setExploredPercentage('0.00');
        setUserTrips([]);
        setRecentActivities([]);
        return null;
    }

    return fetchUserProfile(uid);
    }, [fetchUserProfile]);

    // Helper method to handle saving trip visits
    const addTripVisit = useCallback(
    async ({
        code,
        name,
        startDate,
        endDate,
        tripName,
        notes,
        selectedTripId,
        uploadedPhotosData,
    }: AddTripVisitParams) => {
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error('UserContext: no authenticated user.');

        const countryRef = doc(db, 'users', uid, 'countries', code);
        const countrySnap = await getDoc(countryRef);

        const arrivalTimestamp = startDate ? Timestamp.fromDate(new Date(startDate)) : null;
        const departureTimestamp = endDate ? Timestamp.fromDate(new Date(endDate)) : null;
        const coverPhotoURL = uploadedPhotosData.length > 0 ? uploadedPhotosData[0].url : null;
        let targetTripId = selectedTripId;

        const userDocRef = doc(db, 'users', uid);

        if (countrySnap.exists()) {
        const existingData = countrySnap.data();
        await updateDoc(countryRef, {
            visitCount: increment(1),
            updatedAt: serverTimestamp(),
            firstVisited: existingData.firstVisited || arrivalTimestamp,
            recentArrival: arrivalTimestamp,
            lastVisited: departureTimestamp || existingData.lastVisited || arrivalTimestamp,
            photos: [...(existingData.photos || []), ...uploadedPhotosData],
            coverPhoto: existingData.coverPhoto || coverPhotoURL,
        });
        } else {
        await setDoc(countryRef, {
            countryCode: code,
            countryName: name,
            firstVisited: arrivalTimestamp,
            recentArrival: arrivalTimestamp,
            lastVisited: arrivalTimestamp || departureTimestamp,
            visitCount: 1,
            photos: uploadedPhotosData,
            coverPhoto: coverPhotoURL,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        await updateDoc(userDocRef, {
            'stats.countriesVisited': increment(1),
        });
        }

        if (selectedTripId === 'new' && tripName && tripName.trim() !== '') {
        const newTripRef = doc(collection(db, 'users', uid, 'trips'));
        targetTripId = newTripRef.id;

        await setDoc(newTripRef, {
            title: tripName,
            description: notes || '',
            startDate: arrivalTimestamp,
            endDate: departureTimestamp,
            countries: [code],
            cities: [],
            photos: uploadedPhotosData,
            coverPhoto: coverPhotoURL,
        });

        await updateDoc(userDocRef, {
            'stats.trips': increment(1),
        });
        }

        if (targetTripId && targetTripId !== 'new') {
        const cSnap = await getDoc(countryRef);
        if (cSnap.exists()) {
            const currentTrips = cSnap.data().tripIds || [];
            if (!currentTrips.includes(targetTripId)) {
            await updateDoc(countryRef, { tripIds: [...currentTrips, targetTripId] });
            }
        }
        }

        // Refresh context local state
        await fetchUserProfile(uid);
    },
    [fetchUserProfile]
    );

  const updateUserProfileLocal = useCallback((partial: Partial<UserProfile>) => {
    setUserProfile((prev) => (prev ? deepMergeProfile(prev, partial) : prev));
  }, []);

  const updateUserProfileFields = useCallback(async (fields: Partial<UserProfile>) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('UserContext: no authenticated user.');

    const flatUpdates = flattenForFirestore(fields as Record<string, any>);
    if (Object.keys(flatUpdates).length === 0) return;

    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, flatUpdates);

    setUserProfile((prev) => (prev ? deepMergeProfile(prev, fields) : prev));
  }, []);

  const incrementUserStats = useCallback(
    async (deltas: Partial<Record<StatKey, number>>) => {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('UserContext: no authenticated user.');

      const firestoreUpdates: Record<string, any> = {};
      for (const [key, delta] of Object.entries(deltas)) {
        if (typeof delta === 'number' && delta !== 0) {
          firestoreUpdates[`stats.${key}`] = increment(delta);
        }
      }
      if (Object.keys(firestoreUpdates).length === 0) return;

      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, firestoreUpdates);

      setUserProfile((prev) => {
        if (!prev) return prev;
        const nextStats: NonNullable<UserProfile['stats']> = { ...(prev.stats || {}) };
        for (const [key, delta] of Object.entries(deltas)) {
          if (typeof delta === 'number' && delta !== 0) {
            const statKey = key as StatKey;
            nextStats[statKey] = ((nextStats[statKey] as number) || 0) + delta;
          }
        }
        return { ...prev, stats: nextStats };
      });
    },
    []
  );

  const updateUsername = useCallback(
    async (newUsernameRaw: string): Promise<{ success: boolean; error?: string }> => {
      const uid = auth.currentUser?.uid;
      if (!uid) return { success: false, error: 'No authenticated user.' };

      const newUsername = newUsernameRaw.trim();
      if (!newUsername) return { success: false, error: "Username can't be empty." };

      const oldUsername = userProfile?.username;
      if (oldUsername && oldUsername.toLowerCase() === newUsername.toLowerCase()) {
        return { success: false, error: "New username can't be the same as before." };
      }

      try {
        const newUsernameDocRef = doc(db, 'usernames', newUsername.toLowerCase());
        const existing = await getDoc(newUsernameDocRef);
        if (existing.exists()) {
          return { success: false, error: 'This username is already taken. Please choose another.' };
        }

        const batch = writeBatch(db);
        const userRef = doc(db, 'users', uid);
        batch.update(userRef, { username: newUsername });
        batch.set(newUsernameDocRef, { uid });

        if (oldUsername) {
          const oldUsernameDocRef = doc(db, 'usernames', oldUsername.toLowerCase());
          batch.delete(oldUsernameDocRef);
        }

        await batch.commit();
        setUserProfile((prev) => (prev ? { ...prev, username: newUsername } : prev));
        return { success: true };
      } catch (error) {
        console.error('UserContext: failed to update username:', error);
        return { success: false, error: 'Failed to save changes.' };
      }
    },
    [userProfile]
  );

    const uploadUserFile = useCallback(
    async (
        localUri: string,
        fileName: string,
        onProgress?: (progressPercent: number) => void,
        customPath?: string
    ): Promise<string> => {
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error('UserContext: no authenticated user.');

        const storage = getStorage();
        const response = await fetch(localUri);
        const blob = await response.blob();

        // Default path remains under /userUploads/
        const path = customPath || `userUploads/${uid}/${fileName}`;
        const fileRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(fileRef, blob);

        return new Promise<string>((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
            if (onProgress) {
                onProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            }
            },
            (error) => reject(error),
            async () => {
            try {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
            } catch (err) {
                reject(err);
            }
            }
        );
        });
    },
    []
    );

  const deleteUserFile = useCallback(async (fileUrlOrPath: string): Promise<void> => {
    const storage = getStorage();
    const fileRef = ref(storage, fileUrlOrPath);
    await deleteObject(fileRef);
  }, []);

  const uploadProfilePhoto = useCallback(
    async (
      localUri: string,
      onProgress?: (progressPercent: number) => void
    ): Promise<string> => {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('UserContext: no authenticated user.');

      try {
        const storage = getStorage();
        const folderRef = ref(storage, `userUploads/${uid}`);
        const folderList = await listAll(folderRef);
        const existingProfilePics = folderList.items.filter((item) =>
          item.name.startsWith('profilepicture')
        );
        await Promise.all(
          existingProfilePics.map((fileRef) => deleteObject(fileRef).catch(() => {}))
        );
      } catch (err) {
        console.warn('UserContext: could not clear existing profile photos:', err);
      }

      const fileName = `profilepicture_${Date.now()}.jpg`;
      const downloadURL = await uploadUserFile(localUri, fileName, onProgress);

      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { profilePhoto: downloadURL });
      setUserProfile((prev) => (prev ? { ...prev, profilePhoto: downloadURL } : prev));

      return downloadURL;
    },
    [uploadUserFile]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoading(true);
        await fetchUserProfile(user.uid);
        setLoading(false);
      } else {
        setUserProfile(null);
        setVisitedCountryCodes({});
        setExploredPercentage('0.00');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);

    return (
    <UserContext.Provider
        value={{
        userProfile,
        visitedCountryCodes,
        exploredPercentage,
        userTrips,
        recentActivities,
        loading,
        refreshUserProfile,
        addTripVisit,
        updateUserProfileLocal,
        updateUserProfileFields,
        incrementUserStats,
        updateUsername,
        uploadUserFile,
        deleteUserFile,
        uploadProfilePhoto,
        }}
    >
        {children}
    </UserContext.Provider>
    );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}