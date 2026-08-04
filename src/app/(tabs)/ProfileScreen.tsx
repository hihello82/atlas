import { useRouter } from 'expo-router';
import { getAuth, signOut } from 'firebase/auth'; // Swap with your auth provider if different (e.g., Supabase, Clerk)
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        // Inspect providerData to detect Apple, Google, or Email/Password
        const providers = user.providerData.map((p) => p.providerId);

        if (providers.includes('apple.com')) {
          console.log('Signing out Apple user...');
        } else if (providers.includes('google.com')) {
          console.log('Signing out Google user...');
        } else {
          console.log('Signing out Email/Password user...');
        }

        // Generic session sign-out clears tokens/session for all providers
        await signOut(auth);
      }

      // Route back to the home page (or replace route stack)
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={handleSignOut}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.text}>Sign Out</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#ff3b30',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});