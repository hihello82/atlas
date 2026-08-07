import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../../config/firebaseConfig'; // Adjust import path to your firebase config
import { colors, sharedStyles } from '../styles'; // Adjust import path to sharedStyles

interface UserData {
  firstName?: string;
  lastName?: string;
  username?: string;
  homeCity?: string;
  instagram?: string;
  tiktok?: string;
  profilePhoto?: string;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const userId = auth.currentUser?.uid;

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData>({});
  const [uploadingImage, setUploadingImage] = useState(false);

  // Edit Modal States
  const [activeField, setActiveField] = useState<{
    key: keyof UserData | 'name';
    label: string;
  } | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editSingleValue, setEditSingleValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    if (!userId) return;
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setUserData(snap.data() as UserData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

   const handlePickImage = async () => {
//     const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
//     if (!permissionResult.granted) {
//       Alert.alert('Permission Required', 'Permission to access camera roll is required!');
//       return;
//     }

//     const result = await ImagePicker.launchImageLibraryAsync({
//       mediaTypes: ImagePicker.MediaTypeOptions.Images,
//       allowsEditing: true,
//       aspect: [1, 1],
//       quality: 0.8,
//     });

//     if (!result.canceled && result.assets[0].uri && userId) {
//       uploadProfileImage(result.assets[0].uri);
//     }
//   };

//   const uploadProfileImage = async (uri: string) => {
//     if (!userId) return;
//     setUploadingImage(true);
//     try {
//       const response = await fetch(uri);
//       const blob = await response.blob();
//       const imageRef = ref(storage, `profilePhotos/${userId}.jpg`);

//       await uploadBytes(imageRef, blob);
//       const downloadURL = await getDownloadURL(imageRef);

//       const userRef = doc(db, 'users', userId);
//       await updateDoc(userRef, { profilePhoto: downloadURL });

//       setUserData((prev) => ({ ...prev, profilePhoto: downloadURL }));
//     } catch (error) {
//       console.error('Error uploading image:', error);
//       Alert.alert('Error', 'Failed to upload photo. Please try again.');
//     } finally {
//       setUploadingImage(false);
//     }
   };

  const openEditModal = (key: keyof UserData | 'name', label: string) => {
    setActiveField({ key, label });
    if (key === 'name') {
      setEditFirstName(userData.firstName || '');
      setEditLastName(userData.lastName || '');
    } else {
      setEditSingleValue(userData[key] || '');
    }
  };

  const saveField = async () => {
    if (!userId || !activeField) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', userId);
      let updates: Partial<UserData> = {};

      if (activeField.key === 'name') {
        updates = {
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
        };
      } else {
        updates = {
          [activeField.key]: editSingleValue.trim(),
        };
      }

      await updateDoc(userRef, updates);
      setUserData((prev) => ({ ...prev, ...updates }));
      setActiveField(null);
    } catch (error) {
      console.error('Error updating field:', error);
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();

  if (loading) {
    return (
      <View style={[sharedStyles.appContainer, styles.center]}>
        <ActivityIndicator size="large" color={colors.titleDark} />
      </View>
    );
  }

  return (
    <SafeAreaView style={sharedStyles.appContainer}>
      <View style={{ paddingHorizontal: 24 }}>
        {/* Header Back Button */}
        <View style={sharedStyles.header}>
          <TouchableOpacity
            style={sharedStyles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={[sharedStyles.title, { marginTop: 16 }]}>Edit Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Picture Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} disabled={uploadingImage}>
            {userData.profilePhoto ? (
              <Image source={{ uri: userData.profilePhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={48} color={colors.placeholderGray} />
              </View>
            )}
            {uploadingImage && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color={colors.white} />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7}>
            <Text style={styles.editPhotoText}>Upload profile photo</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Details Group Box */}
        <View style={styles.cardGroup}>
          {/* Name Field */}
          <TouchableOpacity
            style={styles.fieldRow}
            onPress={() => openEditModal('name', 'Name')}
            activeOpacity={0.6}
          >
            <Text style={styles.fieldLabel}>Name</Text>
            <View style={styles.fieldValueContainer}>
              <Text style={styles.fieldValue}>{fullName || 'Set Name'}</Text>
              <Ionicons name="pencil-sharp" size={14} color="#8E9AA0" style={styles.pencilIcon} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Username Field */}
          <TouchableOpacity
            style={styles.fieldRow}
            onPress={() => openEditModal('username', 'Username')}
            activeOpacity={0.6}
          >
            <Text style={styles.fieldLabel}>Username</Text>
            <View style={styles.fieldValueContainer}>
              <Text style={styles.fieldValue}>
                {userData.username ? `@${userData.username}` : 'Set username'}
              </Text>
              <Ionicons name="pencil-sharp" size={14} color="#8E9AA0" style={styles.pencilIcon} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Home City Field */}
          <TouchableOpacity
            style={styles.fieldRow}
            onPress={() => openEditModal('homeCity', 'Home City')}
            activeOpacity={0.6}
          >
            <Text style={styles.fieldLabel}>Home City</Text>
            <View style={styles.fieldValueContainer}>
              <Text style={[styles.fieldValue, !userData.homeCity && styles.placeholderText]}>
                {userData.homeCity || 'Set home city'}
              </Text>
              <Ionicons name="pencil-sharp" size={14} color="#8E9AA0" style={styles.pencilIcon} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Instagram Field */}
          <TouchableOpacity
            style={styles.fieldRow}
            onPress={() => openEditModal('instagram', 'Instagram')}
            activeOpacity={0.6}
          >
            <Text style={styles.fieldLabel}>Instagram</Text>
            <View style={styles.fieldValueContainer}>
              <Text style={styles.fieldValue}>{userData.instagram || ''}</Text>
              <Ionicons name="pencil-sharp" size={14} color="#8E9AA0" style={styles.pencilIcon} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* TikTok Field */}
          <TouchableOpacity
            style={styles.fieldRow}
            onPress={() => openEditModal('tiktok', 'TikTok')}
            activeOpacity={0.6}
          >
            <Text style={styles.fieldLabel}>TikTok</Text>
            <View style={styles.fieldValueContainer}>
              <Text style={styles.fieldValue}>{userData.tiktok || ''}</Text>
              <Ionicons name="pencil-sharp" size={14} color="#8E9AA0" style={styles.pencilIcon} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Account Settings Redirection Row */}
        <TouchableOpacity
          style={styles.accountSettingsButton}
          onPress={() => router.push('/settings')}
          activeOpacity={0.7}
        >
          <Text style={styles.accountSettingsText}>Account settings</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.titleDark} />
        </TouchableOpacity>
      </ScrollView>

      {/* Inline Edit Modal */}
      <Modal visible={!!activeField} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit {activeField?.label}</Text>

            {activeField?.key === 'name' ? (
              <>
                <TextInput
                  style={styles.modalInput}
                  value={editFirstName}
                  onChangeText={setEditFirstName}
                  placeholder="First Name"
                  placeholderTextColor={colors.placeholderGray}
                />
                <TextInput
                  style={[styles.modalInput, { marginTop: 12 }]}
                  value={editLastName}
                  onChangeText={setEditLastName}
                  placeholder="Last Name"
                  placeholderTextColor={colors.placeholderGray}
                />
              </>
            ) : (
              <TextInput
                style={styles.modalInput}
                value={editSingleValue}
                onChangeText={setEditSingleValue}
                placeholder={`Enter ${activeField?.label}`}
                placeholderTextColor={colors.placeholderGray}
                autoCapitalize="none"
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setActiveField(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={saveField}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 10,
  },
  avatarPlaceholder: {
    backgroundColor: '#EAEFEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPhotoText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.titleDark,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7A85',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  cardGroup: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8ECEF',
    overflow: 'hidden',
    marginBottom: 24,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.titleDark,
  },
  fieldValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldValue: {
    fontSize: 15,
    color: colors.subtitleGray,
    marginRight: 6,
  },
  placeholderText: {
    color: colors.placeholderGray,
  },
  pencilIcon: {
    marginLeft: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F3F5',
    marginLeft: 16,
  },
  accountSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8ECEF',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  accountSettingsText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.titleDark,
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.titleDark,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.titleDark,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  cancelText: {
    color: colors.subtitleGray,
    fontSize: 15,
    fontWeight: '600',
  },
  modalSaveButton: {
    backgroundColor: colors.primaryDark,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  saveText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});