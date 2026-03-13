import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  FlatList,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import MapView from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { getParkingComplexes } from '../redux/parkingSlice';
import { MOCK_PARKING_COMPLEXES } from '../data/mockParkingComplexes';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:8000/api/v1';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.06;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const MAP_CENTER = {
  latitude: 37.7919,
  longitude: -122.4140,
};

const MAP_STYLE = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const ComplexCard = ({ complex, onPress }) => {
  const availabilityColor =
    complex.availableSlots > 10
      ? '#22c55e'
      : complex.availableSlots > 0
      ? '#f59e0b'
      : '#ef4444';

  return (
    <TouchableOpacity
      style={styles.complexCard}
      onPress={() => onPress(complex)}
      activeOpacity={0.75}
    >
      <View style={styles.complexCardIcon}>
        <MaterialCommunityIcons name="parking" size={22} color="#2a5298" />
      </View>
      <View style={styles.complexCardBody}>
        <Text style={styles.complexCardName} numberOfLines={1}>
          {complex.name}
        </Text>
        <Text style={styles.complexCardAddress} numberOfLines={1}>
          {complex.address}
        </Text>
        <View style={styles.complexCardMeta}>
          <MaterialCommunityIcons name="star" size={12} color="#f59e0b" />
          <Text style={styles.complexCardMetaText}>{complex.rating}</Text>
          <Text style={styles.complexCardMetaDot}>·</Text>
          <Text style={styles.complexCardMetaText}>${complex.pricePerHour}/hr</Text>
        </View>
      </View>
      <View style={styles.complexCardRight}>
        <Text style={[styles.complexCardAvailable, { color: availabilityColor }]}>
          {complex.availableSlots} free
        </Text>
        <Text style={styles.complexCardTotal}>of {complex.totalSlots}</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );
};

const ParkingMapScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const mapRef = useRef(null);
  const [listVisible, setListVisible] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanImageUri, setScanImageUri] = useState(null);

  const { complexes, complexesLoading } = useSelector((state) => state.parking);
  const displayComplexes = complexes.length > 0 ? complexes : MOCK_PARKING_COMPLEXES;

  useEffect(() => {
    dispatch(getParkingComplexes());
  }, [dispatch]);

  const handleViewSlots = useCallback(
    (complex) => {
      setListVisible(false);
      navigation.navigate('SlotGrid', { complex });
    },
    [navigation]
  );

  const handleScan = useCallback(async (useCamera) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (perm.status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to continue.');
      return;
    }

    const picked = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, mediaTypes: 'images' })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: 'images' });

    if (picked.canceled || !picked.assets?.length) return;

    const asset = picked.assets[0];
    setScanImageUri(asset.uri);
    setScanLoading(true);
    setScanResult(null);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: 'scan.jpg',
        type: 'image/jpeg',
      });
      formData.append('total_spaces', '50');

      const response = await fetch(`${API_URL}/parking/analyze`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }

      const data = await response.json();
      setScanResult(data);
    } catch (e) {
      Alert.alert('Scan Failed', e.message || 'Could not reach the server.');
      setScanImageUri(null);
    } finally {
      setScanLoading(false);
    }
  }, []);

  const handleResetMap = () => {
    mapRef.current?.animateToRegion(
      {
        ...MAP_CENTER,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      },
      400
    );
  };

  const totalAvailable = displayComplexes.reduce(
    (sum, c) => sum + c.availableSlots,
    0
  );
  const totalSlots = displayComplexes.reduce((sum, c) => sum + c.totalSlots, 0);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          ...MAP_CENTER,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsPointsOfInterest={false}
        customMapStyle={MAP_STYLE}
      />

      {/* Top stats bar */}
      <View style={styles.statsBar}>
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => setListVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.statValue}>{displayComplexes.length}</Text>
          <View style={styles.statLabelRow}>
            <Text style={styles.statLabel}>Complexes</Text>
            <MaterialCommunityIcons name="chevron-down" size={12} color="#6b7280" />
          </View>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#22c55e' }]}>
            {totalAvailable}
          </Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalSlots}</Text>
          <Text style={styles.statLabel}>Total Slots</Text>
        </View>
      </View>

      {complexesLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#2a5298" size="small" />
          <Text style={styles.loadingText}>Updating...</Text>
        </View>
      )}

      {/* Scan button */}
      <TouchableOpacity
        style={styles.scanBtn}
        onPress={() =>
          Alert.alert('Scan Parking', 'Choose image source', [
            { text: 'Camera', onPress: () => handleScan(true) },
            { text: 'Gallery', onPress: () => handleScan(false) },
            { text: 'Cancel', style: 'cancel' },
          ])
        }
      >
        {scanLoading
          ? <ActivityIndicator size="small" color="#fff" />
          : <MaterialCommunityIcons name="camera-enhance" size={20} color="#fff" />}
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetBtn} onPress={handleResetMap}>
        <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#fff" />
      </TouchableOpacity>

      {/* Scan Result Modal */}
      <Modal
        visible={!!scanResult}
        transparent
        animationType="slide"
        onRequestClose={() => { setScanResult(null); setScanImageUri(null); }}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => { setScanResult(null); setScanImageUri(null); }}
        />
        {scanResult && (
          <View style={styles.scanSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Scan Results</Text>
              <TouchableOpacity onPress={() => { setScanResult(null); setScanImageUri(null); }}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {scanImageUri && (
              <Image
                source={{ uri: scanImageUri }}
                style={styles.scanPreview}
                resizeMode="cover"
              />
            )}

            <View style={styles.scanStats}>
              <View style={styles.scanStat}>
                <Text style={styles.scanStatValue}>{scanResult.vehicle_count}</Text>
                <Text style={styles.scanStatLabel}>Vehicles Detected</Text>
              </View>
              <View style={styles.scanStatDivider} />
              <View style={styles.scanStat}>
                <Text style={[styles.scanStatValue, { color: '#ef4444' }]}>
                  {scanResult.occupancy?.occupied ?? 0}
                </Text>
                <Text style={styles.scanStatLabel}>Occupied</Text>
              </View>
              <View style={styles.scanStatDivider} />
              <View style={styles.scanStat}>
                <Text style={[styles.scanStatValue, { color: '#22c55e' }]}>
                  {scanResult.occupancy?.available ?? 0}
                </Text>
                <Text style={styles.scanStatLabel}>Available</Text>
              </View>
            </View>

            <View style={styles.scanConfidence}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#2a5298" />
              <Text style={styles.scanConfidenceText}>
                Avg confidence: {((scanResult.confidence_avg ?? 0) * 100).toFixed(1)}%
                {'  ·  '}{scanResult.occupancy?.percentage ?? 0}% full
              </Text>
            </View>
          </View>
        )}
      </Modal>

      <TouchableOpacity style={styles.hint} onPress={() => setListVisible(true)}>
        <MaterialCommunityIcons name="format-list-bulleted" size={13} color="#fff" />
        <Text style={styles.hintText}>  Tap Complexes to browse</Text>
      </TouchableOpacity>

      {/* Complex List Modal */}
      <Modal
        visible={listVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setListVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setListVisible(false)}
        />
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Parking Complexes</Text>
              <Text style={styles.sheetSubtitle}>
                {totalAvailable} slots available across {displayComplexes.length} locations
              </Text>
            </View>
            <TouchableOpacity onPress={() => setListVisible(false)}>
              <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={displayComplexes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ComplexCard complex={item} onPress={handleViewSlots} />
            )}
            ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsBar: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  statLabel: { fontSize: 10, color: '#6b7280', marginTop: 1 },
  statDivider: { width: 1, backgroundColor: '#e5e7eb', marginVertical: 2 },
  loadingOverlay: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
    elevation: 4,
  },
  loadingText: { fontSize: 12, color: '#2a5298', fontWeight: '500' },
  scanBtn: {
    position: 'absolute',
    bottom: 126,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  resetBtn: {
    position: 'absolute',
    bottom: 70,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2a5298',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  hint: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hintText: { color: '#fff', fontSize: 12 },
  // Modal / bottom sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.72,
    paddingBottom: 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  sheetSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  listSeparator: { height: 1, backgroundColor: '#f3f4f6' },
  // Complex cards
  complexCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  complexCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  complexCardBody: { flex: 1 },
  complexCardName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  complexCardAddress: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  complexCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  complexCardMetaText: { fontSize: 11, color: '#6b7280' },
  complexCardMetaDot: { fontSize: 11, color: '#d1d5db' },
  complexCardRight: { alignItems: 'flex-end', gap: 2 },
  complexCardAvailable: { fontSize: 13, fontWeight: '700' },
  complexCardTotal: { fontSize: 11, color: '#9ca3af' },
  // Scan result sheet
  scanSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  scanPreview: {
    width: '100%',
    height: 180,
    marginBottom: 4,
  },
  scanStats: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  scanStat: { flex: 1, alignItems: 'center' },
  scanStatValue: { fontSize: 28, fontWeight: '800', color: '#111827' },
  scanStatLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  scanStatDivider: { width: 1, backgroundColor: '#e5e7eb', marginVertical: 4 },
  scanConfidence: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    gap: 6,
  },
  scanConfidenceText: { fontSize: 12, color: '#6b7280' },
});

export { ParkingMapScreen };
export default ParkingMapScreen;

