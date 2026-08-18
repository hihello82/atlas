import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import { colors, sharedStyles } from '../styles';

export default function AddTrip() {
  const router = useRouter();
  const { code, name } = useLocalSearchParams<{ code: string; name: string }>();

  const auth = getAuth();
  const user = auth.currentUser;

  const { userTrips: existingTrips, addTripVisit, uploadUserFile, deleteUserFile, checkDateOverlap } = useUser();

  const [hasOverlapError, setHasOverlapError] = useState(false);

  const [loading, setLoading] = useState(false);
  const [tripName, setTripName] = useState('');
  const [notes, setNotes] = useState('');

  // Selected dates state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateMode, setDateMode] = useState<'range' | 'month' | 'year'>('range');
  const [selectedMonth, setSelectedMonth] = useState<string>('01');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedSingleYear, setSelectedSingleYear] = useState<string>('2026');

  // Date Picker Modal State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');

  // Dropdown Modal State
  const [selectedTripId, setSelectedTripId] = useState<string>('none');
  const [tripNameError, setTripNameError] = useState(false);
  const [showTripPicker, setShowTripPicker] = useState(false);

  // Photo State
  const [photos, setPhotos] = useState<{ key: string; uri: string; caption: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Image Picking and Compression
  const handleSelectPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1, // Start with high quality, we will compress manually
    });

    if (!result.canceled && result.assets) {
      setLoading(true);
      const processedPhotos: { key: string; uri: string; caption: string }[] = [];

      for (const asset of result.assets) {
        // Determine resizing to make longest side max 1080px
        let resizeAction = {};
        if (asset.width > asset.height) {
          resizeAction = { width: Math.min(1080, asset.width) };
        } else {
          resizeAction = { height: Math.min(1080, asset.height) };
        }

        let quality = 0.8;
        let manipResult = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: resizeAction }],
          { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
        );

        // Dynamically reduce quality until file is under 300kb (307,200 bytes)
        let fileInfo = await FileSystem.getInfoAsync(manipResult.uri);
        while (fileInfo.exists && fileInfo.size && fileInfo.size > 307200 && quality > 0.1) {
          quality -= 0.15;
          manipResult = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: resizeAction }],
            { compress: Math.max(0.1, quality), format: ImageManipulator.SaveFormat.JPEG }
          );
          fileInfo = await FileSystem.getInfoAsync(manipResult.uri);
        }

        processedPhotos.push({
          key: `photo-${Date.now()}-${Math.random()}`,
          uri: manipResult.uri,
          caption: '',
        });
      }

      setPhotos((prev) => [...prev, ...processedPhotos]);
      setLoading(false);
    }
  };

  const handleCaptionChange = (key: string, caption: string) => {
    setPhotos((prev) =>
      prev.map((photo) => (photo.key === key ? { ...photo, caption } : photo))
    );
  };

  const removePhoto = (keyToRemove: string) => {
    setPhotos((prev) => prev.filter((p) => p.key !== keyToRemove));
  };

  // Upload Logic
  const uploadPhotosToStorage = async (): Promise<{ url: string; caption: string }[]> => {
    if (!user || photos.length === 0) return [];

    setIsUploading(true);
    setUploadProgress(0);
    const uploadedResults: { url: string; caption: string }[] = [];
    const totalCount = photos.length;

    try {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const safeName = name.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${safeName}_${Date.now()}_${i}.jpg`;

        const url = await uploadUserFile(
          photo.uri,
          fileName,
          (currentFileProgress) => {
            const overallProgress = ((i * 100) + currentFileProgress) / totalCount;
            setUploadProgress(overallProgress);
          }
        );

        uploadedResults.push({ url, caption: photo.caption });
      }

      setIsUploading(false);
      return uploadedResults;
    } catch (error) {
      // Clean up successfully uploaded photos via context delete handler if operation fails
      await Promise.all(
        uploadedResults.map((item) => deleteUserFile(item.url).catch(() => { }))
      );
      setIsUploading(false);
      throw error;
    }
  };

  const handleDayPress = (day: { dateString: string }) => {
    const dateStr = day.dateString;
    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      setTempStartDate(dateStr);
      setTempEndDate('');
    } else if (tempStartDate && !tempEndDate) {
      if (dateStr < tempStartDate) {
        setTempStartDate(dateStr);
      } else {
        setTempEndDate(dateStr);
      }
    }
  };

  const getMarkedDates = () => {
    const marked: any = {};
    if (!tempStartDate) return marked;

    if (tempStartDate && !tempEndDate) {
      marked[tempStartDate] = { startingDay: true, endingDay: true, color: '#007aff', textColor: '#ffffff' };
      return marked;
    }

    const [year, month, day] = tempStartDate.split('-').map(Number);
    let curr = new Date(year, month - 1, day);
    const end = new Date(tempEndDate);

    while (curr <= end) {
      const dateString = curr.toISOString().split('T')[0];
      const isStart = dateString === tempStartDate;
      const isEnd = dateString === tempEndDate;

      marked[dateString] = {
        startingDay: isStart,
        endingDay: isEnd,
        color: isStart || isEnd ? '#007aff' : '#e0f2fe',
        textColor: isStart || isEnd ? '#ffffff' : '#007aff',
      };
      curr.setDate(curr.getDate() + 1);
    }
    return marked;
  };

  const handleSave = async () => {
    if (!user || !code) return;

    // Validate Trip Name if "Create New Trip" is selected
    if (selectedTripId === 'new' && !tripName.trim()) {
      setTripNameError(true);
      return;
    }
    setTripNameError(false);

    // Make sure something was actually selected for the current mode
    if (dateMode === 'range' && !startDate) return;
    if (dateMode === 'month' && (!selectedMonth || !selectedYear)) return;
    if (dateMode === 'year' && !selectedSingleYear) return;

    setLoading(true);

    // Overlap checking only applies to exact date ranges - a broad
    // month/year selection has no concrete arrival/departure date to
    // compare against existing visits.
    if (dateMode === 'range') {
      const isOverlapping = await checkDateOverlap(code, startDate, endDate);
      if (isOverlapping) {
        setHasOverlapError(true);
        setLoading(false);
        return;
      }
    }

    setHasOverlapError(false);

    let uploadedPhotosData: { url: string; caption: string }[] = [];
    try {
      uploadedPhotosData = await uploadPhotosToStorage();

      await addTripVisit({
        code,
        name,
        startDate: dateMode === 'range' ? startDate : undefined,
        endDate: dateMode === 'range' ? endDate : undefined,
        dateMode,
        selectedMonth: dateMode === 'month' ? selectedMonth : undefined,
        selectedYear:
          dateMode === 'month' ? selectedYear : dateMode === 'year' ? selectedSingleYear : undefined,
        tripName: selectedTripId === 'new' ? tripName : undefined,
        notes,
        selectedTripId,
        uploadedPhotosData,
      });

      setLoading(false);
      router.replace('/HomeScreen');
    } catch (err) {
      console.error('Error saving trip:', err);
      if (uploadedPhotosData.length > 0) {
        await Promise.all(
          uploadedPhotosData.map((p) => deleteUserFile(p.url).catch(() => { }))
        );
      }
      setLoading(false);
      setIsUploading(false);
    }
  };

  const selectedTripLabel =
    selectedTripId === 'none'
      ? 'No Trip Selected'
      : selectedTripId === 'new'
        ? 'Create New Trip'
        : existingTrips.find((t) => t.id === selectedTripId)?.title || '-- Select Trip --';

  const renderPhotoItem = ({ item, drag, isActive }: any) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          style={[styles.photoWrapper, { opacity: isActive ? 0.7 : 1 }]}
        >
          <View style={styles.imageContainer}>
            <Image source={{ uri: item.uri }} style={styles.photoThumbnail} />
            <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(item.key)}>
              <Ionicons name="close-circle" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.captionInput}
            placeholder="Add caption..."
            placeholderTextColor="#94a3b8"
            value={item.caption}
            onChangeText={(text) => handleCaptionChange(item.key, text)}
          />
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={sharedStyles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.headerTitle}>Add new visit to {name}</Text>

          {/* Add Photos Section */}
          <Text style={styles.label}>Trip Photos</Text>
          <Text style={styles.subText}>Drag and drop to reorder. The first photo will be used as the cover photo for the country.</Text>

          <TouchableOpacity style={styles.photoAddButton} onPress={handleSelectPhotos} disabled={loading}>
            <Ionicons name="camera-outline" size={24} color="#007aff" />
            <Text style={styles.photoAddText}>Select Photos</Text>
          </TouchableOpacity>

          {photos.length > 0 && (
            <View style={styles.draggableListContainer}>
              <DraggableFlatList
                horizontal
                data={photos}
                onDragEnd={({ data }) => setPhotos(data)}
                keyExtractor={(item) => item.key}
                renderItem={renderPhotoItem}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 4 }}
              />
            </View>
          )}

          {/* Dropdown Selector */}
          <Text style={styles.label}>Add to Trip</Text>
          <TouchableOpacity style={styles.dropdownSelector} onPress={() => setShowTripPicker(true)}>
            <Text style={styles.dropdownText}>{selectedTripLabel}</Text>
            <Ionicons name="chevron-down" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* Show 'New Trip Name' field only if 'Create New Trip' is selected */}
          {selectedTripId === 'new' && (
            <>
              <Text style={styles.label}>New Trip Name</Text>
              <TextInput
                style={[styles.input, tripNameError && styles.inputError]}
                placeholder="Summer 2026 Backpacking"
                value={tripName}
                onChangeText={(text) => {
                  setTripName(text);
                  if (text.trim()) setTripNameError(false);
                }}
              />
              {tripNameError && (
                <Text style={styles.errorText}>Trip name cannot be empty</Text>
              )}
            </>
          )}

          {/* Always show Visit Notes */}
          <Text style={styles.label}>Visit Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any notes or memories?"
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <Text style={styles.label}>Dates Visited</Text>
          <TouchableOpacity
            style={[styles.dateSelector, hasOverlapError && styles.dateSelectorError]}
            onPress={() => {
              setHasOverlapError(false);
              setTempStartDate(startDate);
              setTempEndDate(endDate);
              setShowDatePicker(true);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={hasOverlapError ? '#ef4444' : '#007aff'} />
            <Text style={styles.dateSelectorText}>
              {dateMode === 'range' && (startDate ? `${startDate}${endDate ? ` to ${endDate}` : ''}` : 'Select dates')}
              {dateMode === 'month' && `${selectedMonth}/${selectedYear}`}
              {dateMode === 'year' && `${selectedSingleYear}`}
            </Text>
          </TouchableOpacity>

          {/* Red overlap error message */}
          {hasOverlapError && (
            <Text style={sharedStyles.fieldErrorText}>
              An existing visit already includes these dates.{' '}
              <Text style={styles.errorTextBold} onPress={() => /*router.push(`/countries/${code}`)*/ console.log('transfer')}>
                Edit visits here
              </Text>
            </Text>
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>Photos are uploading... {Math.round(uploadProgress)}%</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading || isUploading}>
            {(loading || isUploading) ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Visit</Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={showTripPicker} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTripPicker(false)}>
            <View style={styles.dropdownModalContent}>
              <TouchableOpacity
                style={styles.dropdownOption}
                onPress={() => {
                  setSelectedTripId('none');
                  setTripNameError(false);
                  setShowTripPicker(false);
                }}
              >
                <Text style={styles.dropdownOptionText}>No Trip Selected</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownOption}
                onPress={() => {
                  setSelectedTripId('new');
                  setShowTripPicker(false);
                }}
              >
                <Text style={styles.dropdownOptionText}>Create New Trip</Text>
              </TouchableOpacity>
              {existingTrips.map((trip) => (
                <TouchableOpacity
                  key={trip.id}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setSelectedTripId(trip.id);
                    setTripNameError(false);
                    setShowTripPicker(false);
                  }}
                >
                  <Text style={styles.dropdownOptionText}>{trip.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.calendarModalContent}>
              {/* Date Granularity Selector */}
              <View style={styles.granularityTabs}>
                <TouchableOpacity
                  style={[styles.tabButton, dateMode === 'range' && styles.activeTabButton]}
                  onPress={() => setDateMode('range')}
                >
                  <Text style={[styles.tabText, dateMode === 'range' && styles.activeTabText]}>Date Range</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabButton, dateMode === 'month' && styles.activeTabButton]}
                  onPress={() => setDateMode('month')}
                >
                  <Text style={[styles.tabText, dateMode === 'month' && styles.activeTabText]}>Month/Year</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabButton, dateMode === 'year' && styles.activeTabButton]}
                  onPress={() => setDateMode('year')}
                >
                  <Text style={[styles.tabText, dateMode === 'year' && styles.activeTabText]}>Year Only</Text>
                </TouchableOpacity>
              </View>

              {dateMode === 'range' && (
                <>
                  <View style={styles.dateHeader}>
                    <View style={styles.dateHeaderBox}>
                      <Text style={styles.dateHeaderLabel}>From</Text>
                      <Text style={styles.dateHeaderValue}>{tempStartDate || 'Select'}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.dateHeaderBox}>
                      <Text style={styles.dateHeaderLabel}>To</Text>
                      <Text style={styles.dateHeaderValue}>{tempEndDate || 'Select'}</Text>
                    </View>
                  </View>
                  <Calendar
                    markingType={'period'}
                    markedDates={getMarkedDates()}
                    onDayPress={handleDayPress}
                    theme={{ todayTextColor: '#007aff', arrowColor: '#007aff' }}
                  />
                </>
              )}

              {dateMode === 'month' && (
                <View style={styles.broadPickerContainer}>
                  <TextInput
                    style={styles.broadInput}
                    placeholder="MM"
                    keyboardType="number-pad"
                    maxLength={2}
                    value={selectedMonth}
                    onChangeText={setSelectedMonth}
                  />
                  <Text style={styles.broadSeparator}>/</Text>
                  <TextInput
                    style={styles.broadInput}
                    placeholder="YYYY"
                    keyboardType="number-pad"
                    maxLength={4}
                    value={selectedYear}
                    onChangeText={setSelectedYear}
                  />
                </View>
              )}

              {dateMode === 'year' && (
                <View style={styles.broadPickerContainer}>
                  <TextInput
                    style={[styles.broadInput, { width: 120 }]}
                    placeholder="YYYY"
                    keyboardType="number-pad"
                    maxLength={4}
                    value={selectedSingleYear}
                    onChangeText={setSelectedSingleYear}
                  />
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.applyButton]}
                  onPress={() => {
                    if (dateMode === 'range') {
                      setStartDate(tempStartDate);
                      setEndDate(tempEndDate);
                    }
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.applyButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  granularityTabs: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007aff',
    fontWeight: 'bold',
  },
  broadPickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  broadInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
    width: 80,
    backgroundColor: '#fff',
  },
  broadSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#64748b',
  },
  container: { flex: 1, backgroundColor: colors.appBackground },
  content: { padding: 20 },
  header: { width: '100%', paddingHorizontal: 20, paddingTop: 8, alignItems: 'flex-start' },
  headerTitle: { fontSize: 28, fontWeight: '700', fontFamily: 'Playfair Display', marginBottom: 8, color: colors.titleDark }, // aligned color/weight/marginBottom to shared title
  label: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4, marginTop: 16 },
  subText: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  photoAddButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0f2fe', paddingVertical: 12, borderRadius: 8, marginBottom: 12 },
  photoAddText: { fontSize: 16, color: '#007aff', fontWeight: '600', marginLeft: 8 },
  draggableListContainer: { height: 180 },
  photoWrapper: { width: 130, marginRight: 12 },
  imageContainer: { width: 130, height: 110, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photoThumbnail: { width: '100%', height: '100%', resizeMode: 'cover' },
  removePhotoBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: 12 },
  captionInput: { marginTop: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, color: '#1e293b' },
  progressContainer: { marginTop: 24 },
  progressText: { fontSize: 14, color: '#007aff', fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  progressBarBg: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#007aff' },
  dropdownSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12 },
  dropdownText: { fontSize: 16, color: '#1e293b' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, gap: 10 },
  dateSelectorText: { fontSize: 16, color: '#1e293b' },
  saveButton: { backgroundColor: '#007aff', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 32 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dropdownModalContent: { backgroundColor: '#fff', borderRadius: 12, width: '90%', padding: 8 },
  dropdownOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownOptionText: { fontSize: 16, color: '#1e293b' },
  calendarModalContent: { backgroundColor: '#fff', borderRadius: 20, width: '100%', padding: 16 },
  dateHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 12, marginBottom: 12 },
  dateHeaderBox: { flex: 1, alignItems: 'center' },
  dateHeaderLabel: { fontSize: 12, color: '#64748b' },
  dateHeaderValue: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginTop: 2 },
  divider: { width: 1, backgroundColor: '#e2e8f0' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 24, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f1f5f9' },
  cancelButtonText: { color: '#64748b', fontWeight: 'bold' },
  applyButton: { backgroundColor: '#007aff' },
  applyButtonText: { color: '#fff', fontWeight: 'bold' },
  dateSelectorError: {
    borderColor: colors.errorRed,
    borderWidth: 1.5,
  },
  errorTextBold: {
    fontWeight: 'bold',
  },
});