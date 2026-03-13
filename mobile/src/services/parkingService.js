import axios from 'axios';
import { MOCK_PARKING_COMPLEXES } from '../data/mockParkingComplexes';

// For React Native/Expo, use EXPO_PUBLIC_ prefix
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.4:8000/api/v1';

console.log('🔌 API Base URL:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const fetchOccupancy = async (lotId = 'default') => {
  try {
    const response = await apiClient.get(`/parking/${lotId}/occupancy`);
    return response.data;
  } catch (error) {
    console.error('Error fetching occupancy:', error);
    throw error;
  }
};

export const getAvailableSpaces = async (lotId = 'default') => {
  try {
    const response = await apiClient.get(`/parking/${lotId}/available-spaces`);
    return response.data;
  } catch (error) {
    console.error('Error fetching available spaces:', error);
    throw error;
  }
};

export const getParkingHistory = async (lotId = 'default', days = 7) => {
  try {
    const response = await apiClient.get(`/parking/${lotId}/history`, {
      params: { days },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching history:', error);
    throw error;
  }
};

export const bookSpace = async (bookingData) => {
  try {
    const response = await apiClient.post('/parking/book', bookingData);
    return response.data;
  } catch (error) {
    // Fallback: return local confirmation if backend booking endpoint not yet implemented
    console.warn('Booking endpoint not available, using local confirmation:', error.message);
    return {
      bookingId: `BK-${Date.now()}`,
      spaceId: bookingData.spaceId,
      floor: bookingData.floor,
      section: bookingData.section,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      totalPrice: bookingData.totalPrice,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
  }
};

export const fetchComplexes = async () => {
  try {
    const response = await apiClient.get('/parking/complexes');
    return response.data;
  } catch (error) {
    console.warn('Complexes endpoint not available, using mock data:', error.message);
    return { complexes: MOCK_PARKING_COMPLEXES };
  }
};

export const fetchComplexSlots = async (complexId) => {
  try {
    const response = await apiClient.get(`/parking/complexes/${complexId}/slots`);
    return response.data;
  } catch (error) {
    console.warn('Slots endpoint not available, using mock data:', error.message);
    const complex = MOCK_PARKING_COMPLEXES.find((c) => c.id === complexId);
    return { floors: complex ? complex.floors : [] };
  }
};

export const createBooking = async (complexId, bookingData) => {
  try {
    const response = await apiClient.post(`/parking/complexes/${complexId}/book`, bookingData);
    return response.data;
  } catch (error) {
    console.warn('Booking endpoint not available, using local confirmation:', error.message);
    return {
      bookingId: `BK-${Date.now()}`,
      complexId,
      slotId: bookingData.slotId,
      row: bookingData.row,
      floor: bookingData.floor,
      date: bookingData.date,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      totalPrice: bookingData.totalPrice,
      vehiclePlate: bookingData.vehiclePlate,
      vehicleType: bookingData.vehicleType,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
  }
};

/**
 * ========== ADMIN FUNCTIONS ==========
 * Parking space detection and setup
 */

/**
 * Convert image URI to base64
 */
export const imageToBase64 = async (imageUri) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(xhr.response);
    };
    xhr.onerror = reject;
    xhr.open('GET', imageUri);
    xhr.responseType = 'blob';
    xhr.send();
  });
};

/**
 * ADMIN: Detect parking space at clicked point
 * Backend will run YOLO-NAS model at the click coordinates
 */
export const detectSpaceAtPoint = async (imageBase64, clickX, clickY, lotId = 'lot_123') => {
  try {
    const endpoint = '/parking/admin/detect-space-at-point';
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    console.log('🎯 Sending detection request to:', fullUrl);
    console.log('   Image size:', imageBase64 ? imageBase64.length : 0, 'bytes');
    console.log('   Click coordinates: x=' + clickX + ', y=' + clickY);
    console.log('   Lot ID:', lotId);
    
    const response = await apiClient.post(endpoint, {
      image_base64: imageBase64,
      click_x: parseInt(clickX),
      click_y: parseInt(clickY),
      lot_id: lotId,
    });
    
    console.log('✅ Detection response received:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Detection request failed:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
};

/**
 * ADMIN: Save parking layout to Firebase
 * Persists detected spaces for a parking lot
 */
export const saveParkingLayout = async (lotId, spaces) => {
  try {
    const response = await apiClient.post('/parking/admin/save-parking-layout', {
      lot_id: lotId,
      spaces: spaces,
    });
    return response.data;
  } catch (error) {
    console.error('Error saving parking layout:', error);
    throw error;
  }
};

/**
 * ADMIN: Get saved parking layout
 * Retrieves previously detected and saved spaces
 */
export const getParkingLayout = async (lotId) => {
  try {
    const response = await apiClient.get(`/parking/admin/parking-layouts/${lotId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting parking layout:', error);
    throw error;
  }
};

/**
 * ADMIN: Get all spaces detected in image
 * Returns all parking spaces detected by YOLO in the image
 */
export const getAllSpacesInImage = async (imageBase64) => {
  try {
    const response = await apiClient.get('/parking/admin/get-all-spaces', {
      params: { image_base64: imageBase64 },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting all spaces:', error);
    throw error;
  }
};

export default apiClient;
