import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BookingModal from '../components/BookingModal';

const SLOT_WIDTH = 52;
const SLOT_HEIGHT = 44;

const SlotBox = ({ slot, section, onPress }) => {
  const bg = slot.available ? '#dcfce7' : '#fee2e2';
  const border = slot.available ? '#22c55e' : '#ef4444';
  const textColor = slot.available ? '#15803d' : '#b91c1c';

  return (
    <TouchableOpacity
      style={[styles.slot, { backgroundColor: bg, borderColor: border }]}
      onPress={() => slot.available && onPress(slot, section)}
      activeOpacity={slot.available ? 0.75 : 1}
    >
      <Text style={[styles.slotText, { color: textColor }]}>
        {slot.id}
      </Text>
      {!slot.available && (
        <MaterialCommunityIcons name="car" size={11} color="#b91c1c" style={{ marginTop: 1 }} />
      )}
    </TouchableOpacity>
  );
};

const SlotGridScreen = ({ route, navigation }) => {
  const { complex } = route.params;

  const multiFloor = complex.floors.length > 1;
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [bookingSection, setBookingSection] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const currentFloorData = complex.floors[selectedFloor];

  const { availableOnFloor, totalOnFloor } = useMemo(() => {
    let avail = 0;
    let total = 0;
    currentFloorData.sections.forEach((sec) => {
      sec.slots.forEach((s) => {
        total++;
        if (s.available) avail++;
      });
    });
    return { availableOnFloor: avail, totalOnFloor: total };
  }, [currentFloorData]);

  const handleSlotPress = (slot, section) => {
    setBookingSlot(slot);
    setBookingSection(section);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Complex header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.complexName}>{complex.name}</Text>
          <Text style={styles.complexAddress}>{complex.address}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.priceText}>${complex.pricePerHour}/hr</Text>
          <View style={styles.availBadge}>
            <Text style={styles.availBadgeText}>{availableOnFloor} free</Text>
          </View>
        </View>
      </View>

      {/* Floor tabs — only shown for multi-floor complexes */}
      {multiFloor && (
        <View style={styles.floorTabs}>
          {complex.floors.map((floor, index) => (
            <TouchableOpacity
              key={floor.floorNumber}
              style={[
                styles.floorTab,
                selectedFloor === index && styles.floorTabActive,
              ]}
              onPress={() => setSelectedFloor(index)}
            >
              <Text
                style={[
                  styles.floorTabText,
                  selectedFloor === index && styles.floorTabTextActive,
                ]}
              >
                {floor.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Floor availability summary */}
      <View style={styles.floorSummary}>
        <MaterialCommunityIcons name="information-outline" size={14} color="#6b7280" />
        <Text style={styles.floorSummaryText}>
          {availableOnFloor} of {totalOnFloor} slots available on{' '}
          {currentFloorData.label}
        </Text>
      </View>

      {/* Entry/Exit label */}
      <View style={styles.entryLabel}>
        <MaterialCommunityIcons name="arrow-down-circle" size={14} color="#2a5298" />
        <Text style={styles.entryLabelText}>ENTRY / EXIT</Text>
        <MaterialCommunityIcons name="arrow-down-circle" size={14} color="#2a5298" />
      </View>

      {/* Slot grid */}
      <ScrollView
        contentContainerStyle={styles.gridScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentFloorData.sections.map((sec) => (
          <View key={sec.section} style={styles.sectionRow}>
            <View style={styles.sectionLabelContainer}>
              <Text style={styles.sectionLabel}>{sec.section}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.slotsRow}
            >
              {sec.slots.map((slot) => (
                <SlotBox
                  key={slot.id}
                  slot={slot}
                  section={sec.section}
                  onPress={handleSlotPress}
                />
              ))}
            </ScrollView>
          </View>
        ))}

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#dcfce7', borderColor: '#22c55e' }]} />
            <Text style={styles.legendText}>Available — tap to book</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#fee2e2', borderColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Occupied</Text>
          </View>
        </View>
      </ScrollView>

      {/* Booking Modal */}
      <BookingModal
        visible={modalVisible}
        slot={bookingSlot}
        section={bookingSection}
        floor={currentFloorData}
        complex={complex}
        onClose={() => {
          setModalVisible(false);
          setBookingSlot(null);
          setBookingSection(null);
        }}
        onBooked={() => {
          setModalVisible(false);
          setBookingSlot(null);
          setBookingSection(null);
          navigation.navigate('BookingTab');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#2a5298',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerLeft: { flex: 1, marginRight: 12 },
  complexName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  complexAddress: {
    fontSize: 12,
    color: '#bfdbfe',
  },
  headerRight: { alignItems: 'flex-end' },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  availBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  availBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  floorTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  floorTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  floorTabActive: {
    backgroundColor: '#2a5298',
    borderColor: '#2a5298',
  },
  floorTabText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  floorTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  floorSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  floorSummaryText: {
    fontSize: 12,
    color: '#6b7280',
  },
  entryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
  },
  entryLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2a5298',
    letterSpacing: 1.5,
  },
  gridScrollContent: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabelContainer: {
    width: 30,
    height: SLOT_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a5298',
    borderRadius: 6,
    marginRight: 6,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 8,
  },
  slot: {
    width: SLOT_WIDTH,
    height: SLOT_HEIGHT,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotText: {
    fontSize: 12,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendBox: {
    width: 18,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
  },
  legendText: { fontSize: 12, color: '#6b7280' },
});

export default SlotGridScreen;
