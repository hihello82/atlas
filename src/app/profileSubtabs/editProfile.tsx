// REPLACE THE IMPORTS AT THE TOP OF editProfile.tsx WITH:
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
    doc,
    getDoc,
    updateDoc,
    writeBatch
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, getStorage, listAll, ref, uploadBytesResumable } from 'firebase/storage';
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
import { db } from '../../../config/firebaseConfig';
import { colors, sharedStyles } from '../styles';

interface UserData {
  firstName?: string;
  lastName?: string;
  username?: string;
  homeCity?: string;
  instagram?: string;
  tiktok?: string;
  profilePhoto?: string;
}

// REPLACE THE TOP OF EditProfileScreen FUNCTION WITH:
export default function EditProfileScreen() {
  const router = useRouter();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ADD TO THE TOP OF EditProfileScreen FUNCTION (WITH OTHER STATES):
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [singleFieldError, setSingleFieldError] = useState('');

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

// REPLACE handlePickImage AND uploadProfileImage WITH:
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    // Interactive Crop UI (Zoom/Move) via allowsEditing: true & 1:1 aspect ratio
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    // If canceled during photo selection or cropping UI, do not proceed with upload
    if (!result.canceled && result.assets[0] && userId) {
      setUploadingImage(true);
      setUploadProgress(0);

      try {
        const asset = result.assets[0];

        // 1. Calculate dimensions to scale newly cropped image down to max 400x400px
        let resizeAction = {};
        if (asset.width > asset.height) {
          resizeAction = { width: Math.min(400, asset.width) };
        } else {
          resizeAction = { height: Math.min(400, asset.height) };
        }

        let quality = 0.8;
        let manipResult = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: resizeAction }],
          { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
        );

        // 2. Iteratively reduce quality until cropped file size is under 100KB (102,400 bytes)
        let fileInfo = await FileSystem.getInfoAsync(manipResult.uri);
        while (fileInfo.exists && fileInfo.size && fileInfo.size > 102400 && quality > 0.1) {
          quality -= 0.15;
          manipResult = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: resizeAction }],
            { compress: Math.max(0.1, quality), format: ImageManipulator.SaveFormat.JPEG }
          );
          fileInfo = await FileSystem.getInfoAsync(manipResult.uri);
        }

        await uploadProfileImage(manipResult.uri);
      } catch (error) {
        console.error('Error processing image:', error);
        Alert.alert('Error', 'Failed to process image.');
        setUploadingImage(false);
      }
    }
  };

  const uploadProfileImage = async (uri: string) => {
    if (!userId) return;
    const storage = getStorage();
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      // Check for pre-existing files starting with "profilepicture" in /userUploads/uID/
      const folderRef = ref(storage, `userUploads/${userId}`);
      const folderList = await listAll(folderRef);
      const existingProfilePics = folderList.items.filter((item) =>
        item.name.startsWith('profilepicture')
      );

      // Delete existing profile pictures before uploading the new crop
      await Promise.all(
        existingProfilePics.map((fileRef) => deleteObject(fileRef).catch(() => {}))
      );

      // Upload newly cropped & compressed image prefixing file name with "profilepicture"
      const fileName = `profilepicture_${Date.now()}.jpg`;
      const imageRef = ref(storage, `userUploads/${userId}/${fileName}`);
      const uploadTask = uploadBytesResumable(imageRef, blob);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => reject(error),
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { profilePhoto: downloadURL });
            setUserData((prev) => ({ ...prev, profilePhoto: downloadURL }));
            resolve();
          }
        );
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };

// REPLACE openEditModal AND saveField WITH:
  const openEditModal = (key: keyof UserData | 'name', label: string) => {
    setActiveField({ key, label });
    setFirstNameError('');
    setLastNameError('');
    setSingleFieldError('');

    if (key === 'name') {
      setEditFirstName(userData.firstName || '');
      setEditLastName(userData.lastName || '');
    } else {
      setEditSingleValue(userData[key] || '');
    }
  };

// REPLACE THE saveField FUNCTION IN editProfile.tsx
  const saveField = async () => {
    if (!userId || !activeField) return;

    // Reset error states
    setFirstNameError('');
    setLastNameError('');
    setSingleFieldError('');

    const currentFirstName = userData.firstName || '';
    const currentLastName = userData.lastName || '';

    // 1. Name Field Validation
    if (activeField.key === 'name') {
      const trimmedFirst = editFirstName.trim();
      const trimmedLast = editLastName.trim();
      let hasError = false;

      // First Name validation
      if (!trimmedFirst) {
        setFirstNameError("Field can't be empty.");
        hasError = true;
      } else if (trimmedFirst === currentFirstName) {
        setFirstNameError("New first name can't be the same as before.");
        hasError = true;
      }

      // Last Name validation
      if (!trimmedLast) {
        setLastNameError("Field can't be empty.");
        hasError = true;
      } else if (trimmedLast === currentLastName) {
        setLastNameError("New last name can't be the same as before.");
        hasError = true;
      }

      if (hasError) return;
    }

    // 2. Single Field Validation (Username, Home City, Instagram, TikTok)
    if (activeField.key !== 'name') {
      const trimmedValue = editSingleValue.trim();
      const previousValue = (userData[activeField.key as keyof UserData] || '') as string;

      // Empty check
      if (!trimmedValue) {
        setSingleFieldError("Field can't be empty.");
        return;
      }

      // Unchanged value check
      const isUnchanged =
        activeField.key === 'username'
          ? trimmedValue.toLowerCase() === previousValue.toLowerCase()
          : trimmedValue === previousValue;

      if (isUnchanged) {
        setSingleFieldError(`${activeField.label} can't be the same as before.`);
        return;
      }

      // Unique Username Check in Firestore
      if (activeField.key === 'username') {
        setSaving(true);
        try {
          const usernameDocRef = doc(db, 'usernames', trimmedValue.toLowerCase());
          const usernameSnap = await getDoc(usernameDocRef);

          if (
            usernameSnap.exists() &&
            trimmedValue.toLowerCase() !== previousValue.toLowerCase()
          ) {
            setSingleFieldError('This username is already taken. Please choose another.');
            setSaving(false);
            return;
          }
        } catch (err) {
          console.error('Error checking username:', err);
          setSaving(false);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const userRef = doc(db, 'users', userId);

      if (activeField.key === 'username') {
        const newUsername = editSingleValue.trim();
        const oldUsername = userData.username;

        const batch = writeBatch(db);

        // Update user profile
        batch.update(userRef, { username: newUsername });

        // Create new username mapping
        const newUsernameDocRef = doc(db, 'usernames', newUsername.toLowerCase());
        batch.set(newUsernameDocRef, {
          uid: userId,
        });

        // Delete old username mapping
        if (oldUsername && oldUsername.toLowerCase() !== newUsername.toLowerCase()) {
          const oldUsernameDocRef = doc(db, 'usernames', oldUsername.toLowerCase());
          batch.delete(oldUsernameDocRef);
        }

        await batch.commit();
        setUserData((prev) => ({ ...prev, username: newUsername }));
      } else {
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
      }

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
        <TouchableOpacity 
            style={styles.avatarWrapper} 
            onPress={handlePickImage} 
            activeOpacity={0.8} 
            disabled={uploadingImage}
        >
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

        <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7} disabled={uploadingImage}>
            <Text style={styles.editPhotoText}>
            {uploadingImage ? 'Uploading photo...' : 'Upload profile photo'}
            </Text>
        </TouchableOpacity>

        {/* Upload Progress Bar */}
        {uploadingImage && (
            <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Uploading... {Math.round(uploadProgress)}%</Text>
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
            </View>
            </View>
        )}
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
                <View style={sharedStyles.inputContainer}>
                  <TextInput
                    style={[
                      styles.modalInput,
                      firstNameError ? sharedStyles.inputError : null,
                    ]}
                    value={editFirstName}
                    onChangeText={(text) => {
                      setEditFirstName(text);
                      if (firstNameError) setFirstNameError('');
                    }}
                    placeholder="First Name"
                    placeholderTextColor={colors.placeholderGray}
                  />
                  {!!firstNameError && (
                    <Text style={sharedStyles.fieldErrorText}>{firstNameError}</Text>
                  )}
                </View>

                <View style={[sharedStyles.inputContainer, { marginTop: 12 }]}>
                  <TextInput
                    style={[
                      styles.modalInput,
                      lastNameError ? sharedStyles.inputError : null,
                    ]}
                    value={editLastName}
                    onChangeText={(text) => {
                      setEditLastName(text);
                      if (lastNameError) setLastNameError('');
                    }}
                    placeholder="Last Name"
                    placeholderTextColor={colors.placeholderGray}
                  />
                  {!!lastNameError && (
                    <Text style={sharedStyles.fieldErrorText}>{lastNameError}</Text>
                  )}
                </View>
              </>
            ) : (
              <View style={sharedStyles.inputContainer}>
                <TextInput
                  style={[
                    styles.modalInput,
                    singleFieldError ? sharedStyles.inputError : null,
                  ]}
                  value={editSingleValue}
                  onChangeText={(text) => {
                    setEditSingleValue(text);
                    if (singleFieldError) setSingleFieldError('');
                  }}
                  placeholder={`Enter ${activeField?.label}`}
                  placeholderTextColor={colors.placeholderGray}
                  autoCapitalize="none"
                />
                {!!singleFieldError && (
                  <Text style={sharedStyles.fieldErrorText}>{singleFieldError}</Text>
                )}
              </View>
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
  // Add/update wrapper styling for the image touchable area
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden', // Prevents child elements/overlays from leaking outside the circle
    marginBottom: 10,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    backgroundColor: '#EAEFEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
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
  progressContainer: { marginTop: 24 },
  progressText: { fontSize: 14, color: colors.primaryBlue, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  progressBarBg: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.primaryBlue, },
//   progressContainer: {
//     width: '100%',
//     marginTop: 12,
//     paddingHorizontal: 20,
//   },
//   progressText: {
//     fontSize: 13,
//     color: colors.primaryBlue,
//     fontWeight: '600',
//     marginBottom: 6,
//     textAlign: 'center',
//   },
//   progressBarBg: {
//     height: 6,
//     backgroundColor: '#E2E8F0',
//     borderRadius: 3,
//     overflow: 'hidden',
//   },
});