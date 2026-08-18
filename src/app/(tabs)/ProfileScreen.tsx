import { useRouter } from 'expo-router';
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
// NOTE: adjust this relative path to match where UserContext.tsx lives in your project.
import { useUser } from '../context/UserContext';
import { colors, sharedStyles } from '../styles';

export default function ProfileScreen() {
  const router = useRouter();

  // Retrieve user profile and recent activities straight from UserContext
  const { userProfile, recentActivities, loading } = useUser();

  const handleShareProfile = () => {
    console.log('Share Profile Pressed');
  };

  const handleHometownPress = () => {
    console.log('Hometown Pressed');
    // Navigate to location/profile editing screen if needed
  };

  // Helper to format name combining firstName & lastName
  const fullName =
    [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ') ||
    'Traveler';

  // Helper to display formatted username with `@`
  const formattedUsername = userProfile?.username
    ? userProfile.username.startsWith('@')
      ? userProfile.username
      : `@${userProfile.username}`
    : '@username';

  // Helper to derive hometown badge text
  const hometownText =
    userProfile?.homeCity && userProfile?.homeCountry
      ? `${userProfile.homeCity}, ${userProfile.homeCountry}`
      : userProfile?.homeCity || userProfile?.homeCountry || 'Add Hometown';

  if (loading) {
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
                userProfile?.profilePhoto ||
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
              {userProfile?.social?.following ?? 0}
            </Text>
            <Text style={styles.statLabel}>Following</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.statBox, pressed && sharedStyles.pressed]}
            onPress={() => router.push('../profileSubtabs/followers')}
          >
            <Text style={styles.statNumber}>
              {userProfile?.social?.followers ?? 0}
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
              styles.tripsCard,
              pressed && sharedStyles.pressed,
            ]}
            onPress={() =>
              router.push({
                pathname: '/MapScreen',
                params: { section: 'Trips' },
              })
            }
          >
            <Text style={[styles.cardValue, { color: '#9333ea' }]}>
              {userProfile?.stats?.trips ?? 0}
            </Text>
            <Text style={styles.cardLabel}>Trips</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.trackerCard,
              styles.visitedCard,
              pressed && sharedStyles.pressed,
            ]}
            onPress={() =>
              router.push({
                pathname: '/MapScreen',
                params: { section: 'Visited' },
              })
            }
          >
            <Text style={[styles.cardValue, { color: '#0084C7' }]}>
              {userProfile?.stats?.countriesVisited ?? 0}
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
            <Text style={[styles.cardValue, { color: '#1aa216' }]}>
              {userProfile?.stats?.citiesVisited ?? 0}
            </Text>
            <Text style={styles.cardLabel}>Cities</Text>
          </Pressable>
        </View>

        {/* Saved and Achievements Buttons */}
        <View style={styles.secondaryButtonsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              styles.savedButton,
              pressed && sharedStyles.pressed,
            ]}
            onPress={() =>
              router.push({
                pathname: '/MapScreen',
                params: { section: 'Saved' },
              })
            }
          >
            <Text style={styles.savedButtonText}>Saved</Text>
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

        {/* Recent Activity */}
        <View style={styles.recentActivityContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>

          {recentActivities.length > 0 ? (
            recentActivities.map((activity) => {
              const act = activity as any;
              const tripId = act.tripId || (act.type === 'trip' ? act.id.replace('trip-', '') : null);
              const countryCode = act.countryCode || (act.type === 'country' ? act.id.replace('country-', '') : '');
              const countryDisplayName = act.countryName || act.location || countryCode;

              return (
                <View key={activity.id} style={styles.activityCard}>
                  <Image source={{ uri: activity.image }} style={styles.activityImage} />

                  <View style={styles.activityMainContent}>
                    <View style={styles.activityHeaderRow}>
                      {/* Left Side: Clickable Trip & Country Info */}
                      <View style={styles.activityTextContainer}>
                        {/* Trip Title Target */}
                        {tripId ? (
                          <Pressable
                            onPress={() =>
                              router.push({
                                pathname: '../subtabs/[tripid]',
                                params: { tripid: tripId },
                              })
                            }
                            hitSlop={4}
                          >
                            <Text style={styles.tripTitleText}>{activity.title}</Text>
                          </Pressable>
                        ) : (
                          <Text style={styles.tripTitleText}>{activity.title}</Text>
                        )}

                        {/* Country Name Target */}
                        {countryCode ? (
                          <Pressable
                            style={styles.countryBadgeTouch}
                            onPress={() =>
                              router.push({
                                pathname: '/(countries)/[id]',
                                params: {
                                  id: countryCode,
                                  code: countryCode,
                                },
                              })
                            }
                            hitSlop={4}
                          >
                            <Text style={styles.countryNameText}>{countryDisplayName}</Text>
                          </Pressable>
                        ) : (
                          <Text style={styles.countryNameText}>{countryDisplayName}</Text>
                        )}
                      </View>

                      {/* Right Side: Date String */}
                      <Text style={styles.dateText}>{activity.dateString}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyActivityContainer}>
              <Text style={styles.emptyActivityText}>No activity within the past 6 months</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  recentActivityContainer: { width: '100%', marginTop: 10 },
  sectionTitle: { fontSize: 22, fontFamily: 'Playfair Display', fontWeight: '600', letterSpacing: 0.25, color: colors.titleDark, marginBottom: 15, textAlign: 'left' },
  activityCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 12,
  },
  activityImage: { width: 56, height: 56, borderRadius: 12, marginRight: 12 },
  activityMainContent: { flex: 1 },
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  activityTextContainer: { flex: 1, paddingRight: 4 },
  tripTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.titleDark,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  countryBadgeTouch: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  countryNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0084C7',
  },
  dateText: { fontSize: 12, color: colors.placeholderGray, textAlign: 'right' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: colors.appBackground
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#0084C7',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  avatar: { width: '100%', height: '100%', borderRadius: 50 },
  displayName: {
    fontFamily: 'Playfair Display',
    fontSize: 28,
    fontWeight: '700',
    color: colors.titleDark,
    marginBottom: 4,
  },
  username: { fontSize: 15, color: colors.placeholderGray, marginBottom: 10 },

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
  statLabel: { fontSize: 14, color: colors.placeholderGray, marginTop: 2 },

  actionButtonsRow: { flexDirection: 'row', width: '70%', gap: 12, marginBottom: 20, justifyContent: 'center' },
  actionButton: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderColor: colors.borderLight, borderWidth: 1 },
  editButton: { backgroundColor: colors.white, borderColor: colors.borderLight },
  editButtonText: { fontSize: 14, fontWeight: '600', color: colors.titleDark },
  shareButton: { backgroundColor: colors.white, borderColor: colors.borderLight },
  shareButtonText: { fontSize: 14, fontWeight: '600', color: colors.titleDark },

  cardsRow: { flexDirection: 'row', width: '100%', gap: 10, marginBottom: 16 },
  trackerCard: { flex: 1, padding: 12, borderRadius: 16, minHeight: 85, justifyContent: 'space-between' },
  visitedCard: { backgroundColor: '#eef6ff', borderColor: '#d0e5ff', borderWidth: 1 },
  citiesCard: { backgroundColor: '#eeffee', borderColor: '#c6ffd7', borderWidth: 1 },
  tripsCard: { backgroundColor: '#f3e8ff', borderColor: '#e9d5ff', borderWidth: 1 },
  continentsCard: { backgroundColor: colors.white, borderColor: colors.borderLight, borderWidth: 1 },
  cardValue: { fontSize: 22, fontWeight: '700' },
  cardLabel: { fontSize: 12, fontWeight: '500', color: colors.mutedGray },

  secondaryButtonsRow: { flexDirection: 'row', width: '100%', gap: 12, marginBottom: 20 },
  secondaryButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.white, borderColor: colors.borderLight, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 14, fontWeight: '600', color: colors.titleDark },
  savedButton: { backgroundColor: '#fef9c3', borderColor: '#ffec5c' },
  savedButtonText: { fontSize: 14, fontWeight: '600', color: '#ca8a04' },

  activityInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activityLocation: { flex: 1 },
  countryText: { fontSize: 16, fontWeight: 'bold', color: colors.bodyDark, marginBottom: 4 },
  cityText: { fontSize: 14, color: colors.subtitleGray },
  emptyActivityContainer: { paddingVertical: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight },
  emptyActivityText: { fontSize: 15, color: colors.mutedGray, fontWeight: '500' },
});