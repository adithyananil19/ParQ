import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { submitBooking } from '../redux/parkingSlice';

// Generate next 7 days as selectable pills
const buildDateOptions = () => {
  const days = [];
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push({
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayNames[d.getDay()],
      sublabel: `${monthNames[d.getMonth()]} ${d.getDate()}`,
      date: d.toISOString().slice(0, 10),
    });
  }
  return days;
};

// 30-min slots from 6:00 to 23:00
const buildTimeSlots = () => {
  const slots = [];
  for (let h = 6; h <= 22; h++) {
    ['00', '30'].forEach((m) => {
      const hour = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      slots.push({ label: `${hour}:${m} ${ampm}`, value: `${String(h).padStart(2,'0')}:${m}` });
    });
  }
  slots.push({ label: '11:00 PM', value: '23:00' });
  return slots;
};

const DURATION_OPTIONS = [
  { label: '30m', value: 0.5 },
  { label: '1 hr', value: 1 },
  { label: '2 hr', value: 2 },
  { label: '3 hr', value: 3 },
  { label: '4 hr', value: 4 },
];

const VEHICLE_TYPES = ['Car', 'SUV', 'Motorcycle'];

const DATE_OPTIONS = buildDateOptions();
const TIME_SLOTS = buildTimeSlots();

const addHours = (timeStr, hours) => {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMins = h * 60 + m + hours * 60;
  const endH = Math.floor(totalMins / 60) % 24;
  const endM = totalMins % 60;
  return `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
};

const BookingModal = ({ visible, slot, section, floor, complex, onClose, onBooked }) => {
  const dispatch = useDispatch();
  const bookingLoading = useSelector((s) => s.parking.bookingLoading);

  const [selectedDate, setSelectedDate] = useState(DATE_OPTIONS[0].date);
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[0].value);
  const [duration, setDuration] = useState(1);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('Car');

  const endTime = useMemo(() => addHours(selectedTime, duration), [selectedTime, duration]);
  const totalPrice = complex ? complex.pricePerHour * duration : 0;

  if (!slot || !complex) return null;

  const handleConfirm = async () => {
    if (!vehiclePlate.trim()) {
      Alert.alert('Missing Info', 'Please enter your vehicle plate number.');
      return;
    }

    try {
      await dispatch(
        submitBooking({
          complexId: complex.id,
          bookingData: {
            slotId: slot.id,
            row: slot.row,
            slotNum: slot.num,
            section,
            floor: floor.floorNumber,
            floorLabel: floor.label,
            date: selectedDate,
            startTime: `${selectedDate}T${selectedTime}:00`,
            endTime: `${selectedDate}T${endTime}:00`,
            duration,
            vehiclePlate: vehiclePlate.trim().toUpperCase(),
            vehicleType,
            totalPrice,
            complexName: complex.name,
          },
        })
      ).unwrap();

      Alert.alert(
        '✓ Booking Confirmed',
        `Slot ${slot.id} on ${floor.label}\n${selectedDate} · ${selectedTime}–${endTime}\nVehicle: ${vehiclePlate.trim().toUpperCase()}\nTotal: $${totalPrice.toFixed(2)}`,
        [{ text: 'OK', onPress: onBooked }]
      );
    } catch (error) {
      Alert.alert('Booking Failed', error.message || 'Please try again.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Book Slot {slot.id}</Text>
              <Text style={styles.headerSub}>
                {floor.label} · {complex.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* Date selection */}
            <Text style={styles.sectionLabel}>Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
              {DATE_OPTIONS.map((d) => (
                <TouchableOpacity
                  key={d.date}
                  style={[styles.pill, selectedDate === d.date && styles.pillActive]}
                  onPress={() => setSelectedDate(d.date)}
                >
                  <Text style={[styles.pillMain, selectedDate === d.date && styles.pillMainActive]}>
                    {d.label}
                  </Text>
                  <Text style={[styles.pillSub, selectedDate === d.date && styles.pillSubActive]}>
                    {d.sublabel}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Start time */}
            <Text style={styles.sectionLabel}>Start Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
              {TIME_SLOTS.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.timePill, selectedTime === t.value && styles.pillActive]}
                  onPress={() => setSelectedTime(t.value)}
                >
                  <Text style={[styles.timePillText, selectedTime === t.value && styles.pillMainActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Duration */}
            <Text style={styles.sectionLabel}>Duration</Text>
            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map((d) => (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.durationBtn, duration === d.value && styles.durationBtnActive]}
                  onPress={() => setDuration(d.value)}
                >
                  <Text style={[styles.durationText, duration === d.value && styles.durationTextActive]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Vehicle type */}
            <Text style={styles.sectionLabel}>Vehicle Type</Text>
            <View style={styles.vehicleTypeRow}>
              {VEHICLE_TYPES.map((vt) => (
                <TouchableOpacity
                  key={vt}
                  style={[styles.vehicleTypeBtn, vehicleType === vt && styles.vehicleTypeBtnActive]}
                  onPress={() => setVehicleType(vt)}
                >
                  <MaterialCommunityIcons
                    name={vt === 'Car' ? 'car' : vt === 'SUV' ? 'car-estate' : 'motorbike'}
                    size={20}
                    color={vehicleType === vt ? '#fff' : '#6b7280'}
                  />
                  <Text style={[styles.vehicleTypeText, vehicleType === vt && styles.vehicleTypeTextActive]}>
                    {vt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Vehicle plate */}
            <Text style={styles.sectionLabel}>License Plate</Text>
            <TextInput
              style={styles.plateInput}
              placeholder="e.g. KL-07-AB-1234"
              placeholderTextColor="#9ca3af"
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              autoCapitalize="characters"
              maxLength={15}
            />

            {/* Summary */}
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Time</Text>
                <Text style={styles.summaryValue}>{selectedTime} – {endTime}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Duration</Text>
                <Text style={styles.summaryValue}>
                  {duration === 0.5 ? '30 minutes' : `${duration} hour${duration > 1 ? 's' : ''}`}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Rate</Text>
                <Text style={styles.summaryValue}>${complex.pricePerHour}/hr</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${totalPrice.toFixed(2)}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={bookingLoading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, bookingLoading && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={bookingLoading}
            >
              <Text style={styles.confirmBtnText}>
                {bookingLoading ? 'Booking...' : `Confirm · $${totalPrice.toFixed(2)}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  closeBtn: { padding: 4 },
  body: { paddingHorizontal: 20, paddingVertical: 16 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  pillRow: { marginBottom: 4 },
  pill: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    marginRight: 8,
    minWidth: 64,
  },
  pillActive: { backgroundColor: '#2a5298', borderColor: '#2a5298' },
  pillMain: { fontSize: 13, fontWeight: '600', color: '#374151' },
  pillMainActive: { color: '#fff' },
  pillSub: { fontSize: 10, color: '#9ca3af', marginTop: 1 },
  pillSubActive: { color: '#bfdbfe' },
  timePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    marginRight: 8,
  },
  timePillText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  durationBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  durationBtnActive: { backgroundColor: '#2a5298', borderColor: '#2a5298' },
  durationText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  durationTextActive: { color: '#fff' },
  vehicleTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  vehicleTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  vehicleTypeBtnActive: { backgroundColor: '#2a5298', borderColor: '#2a5298' },
  vehicleTypeText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  vehicleTypeTextActive: { color: '#fff' },
  plateInput: {
    height: 46,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
    letterSpacing: 1.5,
  },
  summary: {
    marginTop: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: { fontSize: 13, color: '#6b7280' },
  summaryValue: { fontSize: 13, color: '#374151', fontWeight: '500' },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 6,
    paddingTop: 10,
  },
  totalLabel: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#2a5298' },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  confirmBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#2a5298',
    alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: '#9ca3af' },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export { BookingModal };
export default BookingModal;

