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
import { colors, sharedStyles } from '../styles';

export default function Cities () {

    const router = useRouter();

    return(
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

                {/* Top Navigation Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                    style={sharedStyles.backButton}
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
                    <Text style={sharedStyles.subtitle}>Cities feature coming soon!</Text>
                </View>
                </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.appBackground, // was '#FFFFFF'
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    width: '100%',
    paddingTop: 8,
    alignItems: 'flex-start',
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
});