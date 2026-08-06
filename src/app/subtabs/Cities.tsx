import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Cities () {

    const router = useRouter();

    return(
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

                {/* Top Navigation Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    >
                    <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
                    </TouchableOpacity>
                </View>
<ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          keyboardShouldPersistTaps="handled"
        >
                <View style={styles.textSection}>
                    <Text style={styles.subtitle}>Cities feature coming soon!</Text>
                </View>
                </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    width: '100%',
    paddingTop: 8,
    alignItems: 'flex-start',
  },
    backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#5C6B73',
    fontWeight: '400',
  },
  textSection: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 120,
    flexGrow: 1,
  },
})