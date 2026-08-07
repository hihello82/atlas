import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, sharedStyles } from '../styles';

interface UserData {
  uid: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  profilePhoto?: string | null;
  homeCountry?: string;
  homeCity?: string;
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
}

export default function ProfileScreen() {
  const router = useRouter();
  const [fetchingData, setFetchingData] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            setUserData(docSnap.data() as UserData);
          } else {
            setUserData({
              uid: user.uid,
              username: user.email ? user.email.split('@')[0] : '',
              firstName: user.displayName ? user.displayName.split(' ')[0] : 'Traveler',
              lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
              profilePhoto: user.photoURL || null,
              stats: {
                countriesVisited: 0,
                citiesVisited: 0,
                continentsVisited: 0,
                trips: 0,
              },
              social: {
                followers: 0,
                following: 0,
              },
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setFetchingData(false);
      }
    };

    fetchUserData();
  }, []);

  const handleShareProfile = () => {
    console.log('Share Profile Pressed');
  };

  const handleHometownPress = () => {
    console.log('Hometown Pressed');
    // Navigate to location/profile editing screen if needed
  };

  // Helper to format name combining firstName & lastName
  const fullName =
    [userData?.firstName, userData?.lastName].filter(Boolean).join(' ') ||
    'Traveler';

  // Helper to display formatted username with `@`
  const formattedUsername = userData?.username
    ? userData.username.startsWith('@')
      ? userData.username
      : `@${userData.username}`
    : '@username';

  // Helper to derive hometown badge text
  const hometownText =
    userData?.homeCity && userData?.homeCountry
      ? `${userData.homeCity}, ${userData.homeCountry}`
      : userData?.homeCity || userData?.homeCountry || 'Add Hometown';

  if (fetchingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={sharedStyles.appContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Picture */}
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri:
                userData?.profilePhoto ||
                'https://via.placeholder.com/150',
            }}
            style={styles.avatar}
          />
        </View>

        {/* Name and Username */}
        <Text style={styles.displayName}>{fullName}</Text>
        <Text style={styles.username}>{formattedUsername}</Text>

        {/* Hometown Badge / Button */}
        <Pressable
          style={({ pressed }) => [
            styles.hometownBadge,
            pressed && sharedStyles.pressed,
          ]}
          onPress={handleHometownPress}
        >
          <Text style={styles.hometownText}>{hometownText}</Text>
        </Pressable>

        {/* Followers & Following Row */}
        <View style={styles.statsRow}>
          <Pressable
            style={({ pressed }) => [styles.statBox, pressed && sharedStyles.pressed]}
            onPress={() => router.push('../profileSubtabs/following')}
          >
            <Text style={styles.statNumber}>
              {userData?.social?.following ?? 0}
            </Text>
            <Text style={styles.statLabel}>Following</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.statBox, pressed && sharedStyles.pressed]}
            onPress={() => router.push('../profileSubtabs/followers')}
          >
            <Text style={styles.statNumber}>
              {userData?.social?.followers ?? 0}
            </Text>
            <Text style={styles.statLabel}>Followers</Text>
          </Pressable>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.editButton,
              pressed && sharedStyles.pressed,
            ]}
            onPress={() => router.push('../profileSubtabs/editProfile')}
          >
            <Text style={styles.editButtonText}>Edit profile</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.shareButton,
              pressed && sharedStyles.pressed,
            ]}
            onPress={handleShareProfile}
          >
            <Text style={styles.shareButtonText}>Share profile</Text>
          </Pressable>
        </View>

        {/* Travel Trackers Cards (3 Column Layout) */}
        <View style={styles.cardsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.trackerCard,
              styles.visitedCard,
              pressed && sharedStyles.pressed,
            ]}
            onPress={() => router.push('../subtabs/Countries')}
          >
            <Text style={[styles.cardValue, { color: '#0084C7' }]}>
              {userData?.stats?.countriesVisited ?? 0}
            </Text>
            <Text style={styles.cardLabel}>Countries</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.trackerCard,
              styles.citiesCard,
              pressed && sharedStyles.pressed,
            ]}
            onPress={() => router.push('../subtabs/Cities')}
          >
            <Text style={[styles.cardValue, { color: '#10B981' }]}>
              {userData?.stats?.citiesVisited ?? 0}
            </Text>
            <Text style={styles.cardLabel}>Cities</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.trackerCard,
              styles.continentsCard,
              pressed && sharedStyles.pressed,
            ]}
            onPress={() => router.push('../subtabs/Continents')}
          >
            <Text style={[styles.cardValue, { color: '#111827' }]}>
              {userData?.stats?.continentsVisited ?? 0}
            </Text>
            <Text style={styles.cardLabel}>Continents</Text>
          </Pressable>
        </View>

        {/* Saved and Achievements Buttons */}
        <View style={styles.secondaryButtonsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && sharedStyles.pressed,
            ]}
            onPress={() => router.push('../profileSubtabs/saved')}
          >
            <Text style={styles.secondaryButtonText}>Saved</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && sharedStyles.pressed,
            ]}
            onPress={() => router.push('../profileSubtabs/achievements')}
          >
            <Text style={styles.secondaryButtonText}>Achievements</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { paddingVertical: 40, paddingHorizontal: 20, alignItems: 'center', backgroundColor: colors.appBackground },
  avatarContainer: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#0084C7', padding: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatar: { width: '100%', height: '100%', borderRadius: 50 },
  displayName: {
    fontFamily: 'Playfair Display',
    fontSize: 28,
    fontWeight: '700',
    color: colors.titleDark,
    marginBottom: 4,
  },
  username: { fontSize: 15, color: '#9CA3AF', marginBottom: 10 },
  
  /* Hometown Pill Badge Styling */
  hometownBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  hometownText: {
    color: '#0284C7',
    fontSize: 14,
    fontWeight: '600',
  },

  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 32, marginBottom: 20 },
  statBox: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '700', color: colors.titleDark },
  statLabel: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
  
  /* Compacted Action Buttons */
  actionButtonsRow: { flexDirection: 'row', width: '70%', gap: 12, marginBottom: 20, justifyContent: 'center' },
  actionButton: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderColor: '#eee', borderWidth: 1 },
  editButton: { backgroundColor: colors.white, borderColor: colors.borderLight },
  editButtonText: { fontSize: 14, fontWeight: '600', color: colors.titleDark },
  shareButton: { backgroundColor: colors.white, borderColor: colors.borderLight },
  shareButtonText: { fontSize: 14, fontWeight: '600', color: colors.titleDark },

  /* 3-Card Row Tracker Styling */
  cardsRow: { flexDirection: 'row', width: '100%', gap: 10, marginBottom: 16 },
  trackerCard: { flex: 1, padding: 12, borderRadius: 16, minHeight: 85, justifyContent: 'space-between' },
  visitedCard: { backgroundColor: '#eef6ff', borderColor: '#d0e5ff', borderWidth: 1 },
  citiesCard: { backgroundColor: '#eeffee', borderColor: '#dcf4dc', borderWidth: 1 },
  continentsCard: { backgroundColor: colors.white, borderColor: colors.borderLight, borderWidth: 1 },
  cardValue: { fontSize: 22, fontWeight: '700' },
  cardLabel: { fontSize: 12, fontWeight: '500', color: colors.mutedGray },

  /* Saved & Achievements Row Styling */
  secondaryButtonsRow: { flexDirection: 'row', width: '100%', gap: 12, marginBottom: 20 },
  secondaryButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.white, borderColor: colors.borderLight, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 14, fontWeight: '600', color: colors.titleDark },
});