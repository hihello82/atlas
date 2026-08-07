import { useRouter } from 'expo-router';
import { getAuth, signOut } from 'firebase/auth';
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
  stats?: {
    countriesVisited?: number;
    citiesVisited?: number;
    trips?: number;
  };
  social?: {
    followers?: number;
    following?: number;
  };
}

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
            // Fallback object matching your schema structure
            setUserData({
              uid: user.uid,
              username: user.email ? user.email.split('@')[0] : '',
              firstName: user.displayName ? user.displayName.split(' ')[0] : 'Traveler',
              lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
              profilePhoto: user.photoURL || null,
              stats: {
                countriesVisited: 0,
                citiesVisited: 0,
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

  const handleEditProfile = () => {
    console.log('Edit Profile Pressed');
    router.push('../profileSubtabs/soettings');
  };

  const handleShareProfile = () => {
    console.log('Share Profile Pressed');
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;

      if (user) {
        const providers = user.providerData.map((p) => p.providerId);

        if (providers.includes('apple.com')) {
          console.log('Signing out Apple user...');
        } else if (providers.includes('google.com')) {
          console.log('Signing out Google user...');
        } else {
          console.log('Signing out Email/Password user...');
        }

        await signOut(auth);
      }

      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
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
            onPress={handleEditProfile}
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

        {/* Travel Trackers Cards */}
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
            <Text style={styles.cardLabel}>Visited Countries</Text>
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
            <Text style={styles.cardLabel}>Cities Tracked</Text>
            </Pressable>
        </View>

        {/* Debug Sign Out Button */}
        <View style={styles.footerContainer}>
            <Pressable
            style={({ pressed }) => [styles.signOutButton, pressed && sharedStyles.pressed]}
            onPress={handleSignOut}
            disabled={loading}
            >
            {loading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.signOutText}>Sign Out (Debug)</Text>
            )}
            </Pressable>
        </View>
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { paddingVertical: 40, paddingHorizontal: 20, alignItems: 'center', backgroundColor: '#f8f9fa' },
  avatarContainer: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#0084C7', padding: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatar: { width: '100%', height: '100%', borderRadius: 50 },
  displayName: {
    fontFamily: 'Playfair Display', // was 'PlayfairDisplay' (typo)
    fontSize: 28,                    // aligned to shared title size
    fontWeight: '700',                // was '700' already — kept
    color: colors.titleDark,          // was '#111827'
    marginBottom: 8,                  // aligned to shared title spacing
  },
  username: { fontSize: 15, color: '#9CA3AF', marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 32, marginBottom: 20 },
  statBox: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
  actionButtonsRow: { flexDirection: 'row', width: '100%', gap: 12, marginBottom: 24 },
  actionButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderColor: '#eee', borderWidth: 1 },
  editButton: { backgroundColor: '#FFFFFF', borderColor: '#eee' },
  editButtonText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  shareButton: { backgroundColor: '#FFFFFF', borderColor: '#eee' },
  shareButtonText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardsRow: { flexDirection: 'row', width: '100%', gap: 12, marginBottom: 32 },
  trackerCard: { flex: 1, padding: 16, borderRadius: 16, minHeight: 90, justifyContent: 'space-between' },
  visitedCard: { backgroundColor: '#eef6ff', borderColor: '#d0e5ff', borderWidth: 1 },
  citiesCard: { backgroundColor: '#eeffee', borderColor: '#dcf4dc', borderWidth: 1 },
  cardValue: { fontSize: 24, fontWeight: '700' },
  cardLabel: { fontSize: 13, fontWeight: '500', color: '#4B5563' },
  footerContainer: { width: '100%', marginTop: 'auto', alignItems: 'center' },
  signOutButton: { backgroundColor: '#ff3b30', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, width: '100%', alignItems: 'center' },
  signOutText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});