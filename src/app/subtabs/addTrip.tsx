import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, increment, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../../config/firebaseConfig';

export default function AddTrip() {
  const router = useRouter();
  const { code, name } = useLocalSearchParams<{ code: string; name: string }>();

  const auth = getAuth();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(false);
  const [tripName, setTripName] = useState('');
  const [notes, setNotes] = useState('');

  // Selected dates state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Date Picker Modal State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');

  // Dropdown Modal State (Replaces RNCPicker)
  const [existingTrips, setExistingTrips] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('new');
  const [showTripPicker, setShowTripPicker] = useState(false);

  useEffect(() => {
    const fetchTrips = async () => {
      if (!user) return;
      try {
        const tripsRef = collection(db, 'users', user.uid, 'trips');
        const tripsSnap = await getDocs(tripsRef);
        const trips = tripsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setExistingTrips(trips);
      } catch (err) {
        console.error('Failed to fetch trips:', err);
      }
    };
    fetchTrips();
  }, [user]);

  // Handle range selection on the calendar
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

  // Generate marked dates for range highlighting
  const getMarkedDates = () => {
    const marked: any = {};
    if (!tempStartDate) return marked;

    if (tempStartDate && !tempEndDate) {
      marked[tempStartDate] = {
        startingDay: true,
        endingDay: true,
        color: '#007aff',
        textColor: '#ffffff',
      };
      return marked;
    }

    let curr = new Date(tempStartDate);
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
    setLoading(true);

    try {
      const uid = user.uid;
      const countryRef = doc(db, 'users', uid, 'countries', code);
      const countrySnap = await getDoc(countryRef);

      const arrivalTimestamp = startDate ? Timestamp.fromDate(new Date(startDate)) : null;
      const departureTimestamp = endDate ? Timestamp.fromDate(new Date(endDate)) : null;
      let targetTripId = selectedTripId;

      if (countrySnap.exists()) {
        const existingData = countrySnap.data();
        await updateDoc(countryRef, {
          visitCount: increment(1),
          updatedAt: serverTimestamp(),
          firstVisited: existingData.firstVisited || arrivalTimestamp,
          lastVisited: departureTimestamp || existingData.lastVisited || arrivalTimestamp,
        });
      } else {
        await setDoc(countryRef, {
          countryCode: code,
          countryName: name,
          firstVisited: arrivalTimestamp,
          lastVisited: arrivalTimestamp || departureTimestamp,
          visitCount: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const statsRef = doc(db, 'users', `${uid}/stats`);
        await setDoc(statsRef, { countriesVisited: increment(1) }, { merge: true });
      }

      if (selectedTripId === 'new' && tripName.trim() !== '') {
        const newTripRef = doc(collection(db, 'users', uid, 'trips'));
        targetTripId = newTripRef.id;

        await setDoc(newTripRef, {
          title: tripName,
          description: notes,
          startDate: arrivalTimestamp,
          endDate: departureTimestamp,
          countries: [code],
          cities: [],
          coverPhoto: null,
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

      setLoading(false);
      router.back();
    } catch (err) {
      console.error('Error saving trip:', err);
      setLoading(false);
    }
  };

  const selectedTripLabel =
    selectedTripId === 'new'
      ? '-- Create New Trip --'
      : existingTrips.find((t) => t.id === selectedTripId)?.title || '-- Select Trip --';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>Record Visit: {name}</Text>

        {/* Custom Select Trip Dropdown */}
        <Text style={styles.label}>Add to Trip</Text>
        <TouchableOpacity style={styles.dropdownSelector} onPress={() => setShowTripPicker(true)}>
          <Text style={styles.dropdownText}>{selectedTripLabel}</Text>
          <Ionicons name="chevron-down" size={20} color="#64748b" />
        </TouchableOpacity>

        {selectedTripId === 'new' && (
          <>
            <Text style={styles.label}>New Trip Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Summer 2026 Backpacking"
              value={tripName}
              onChangeText={setTripName}
            />

            <Text style={styles.label}>Trip Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any memories or notes?"
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </>
        )}

        {/* Calendar Range Selector Field */}
        <Text style={styles.label}>Dates Visited</Text>
        <TouchableOpacity
          style={styles.dateSelector}
          onPress={() => {
            setTempStartDate(startDate);
            setTempEndDate(endDate);
            setShowDatePicker(true);
          }}
        >
          <Ionicons name="calendar-outline" size={20} color="#007aff" />
          <Text style={styles.dateSelectorText}>
            {startDate ? `${startDate}${endDate ? ` to ${endDate}` : ''}` : 'Select dates'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Visit</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Trip Dropdown Modal */}
      <Modal visible={showTripPicker} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTripPicker(false)}>
          <View style={styles.dropdownModalContent}>
            <TouchableOpacity
              style={styles.dropdownOption}
              onPress={() => {
                setSelectedTripId('new');
                setShowTripPicker(false);
              }}
            >
              <Text style={styles.dropdownOptionText}>-- Create New Trip --</Text>
            </TouchableOpacity>
            {existingTrips.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                style={styles.dropdownOption}
                onPress={() => {
                  setSelectedTripId(trip.id);
                  setShowTripPicker(false);
                }}
              >
                <Text style={styles.dropdownOptionText}>{trip.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Range Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalContent}>
            {/* Header displaying From / To */}
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

            {/* Calendar */}
            <Calendar
              markingType={'period'}
              markedDates={getMarkedDates()}
              onDayPress={handleDayPress}
              theme={{
                todayTextColor: '#007aff',
                arrowColor: '#007aff',
              }}
            />

            {/* Cancel & Apply Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.applyButton]}
                onPress={() => {
                  setStartDate(tempStartDate);
                  setEndDate(tempEndDate);
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: { padding: 20 },
  header: {
    width: '100%',
    paddingHorizontal: 20,
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
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#1a1a24' },
  label: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  dropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
  },
  dropdownText: { fontSize: 16, color: '#1e293b' },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  dateSelectorText: { fontSize: 16, color: '#1e293b' },
  saveButton: {
    backgroundColor: '#007aff',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    padding: 8,
  },
  dropdownOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownOptionText: { fontSize: 16, color: '#1e293b' },
  calendarModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    padding: 16,
  },
  dateHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 12,
    marginBottom: 12,
  },
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
});