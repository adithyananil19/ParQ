import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { logout } from '../redux/authSlice';
import { clearAuth } from '../utils/tokenStorage';

const AdminDashboard = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState('upload');
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);
  const [isReloadingModel, setIsReloadingModel] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  const token = useSelector(state => state.auth.token);
  const dispatch = useDispatch();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await clearAuth();
          dispatch(logout());
        },
      },
    ]);
  };

  useEffect(() => {
    fetchModelStatus();
    const interval = setInterval(fetchModelStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchModelStatus = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/parking/model-status`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setModelStatus(response.data);
    } catch (error) {
      console.log('Could not fetch model status:', error.message);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0]);
        setResults(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  };

  const handleUploadSelectedImage = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }
    await uploadImage(selectedImage);
  };

  const uploadImage = async (imageAsset) => {
    try {
      setUploading(true);
      setResults(null);

      const formData = new FormData();
      formData.append('file', {
        uri: imageAsset.uri,
        type: 'image/jpeg',
        name: imageAsset.fileName || 'image.jpg',
      });

      const response = await axios.post(
        `${API_BASE_URL}/api/v1/parking/upload-image`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setResults(response.data);
      setSelectedImage(null);
      Alert.alert('Success', 'Image processed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to process image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleReloadModel = async () => {
    try {
      setIsReloadingModel(true);
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/parking/reload-model`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      Alert.alert('Success', response.data.message);
      setModelStatus(response.data.details);
    } catch (error) {
      Alert.alert('Error', 'Failed to reload model: ' + error.message);
    } finally {
      setIsReloadingModel(false);
    }
  };

  const TabButton = ({ label, icon, active, onPress }) => (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Parking Detection</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
        
        {/* Model Status */}
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>Model Status</Text>
          {modelStatus ? (
            <View>
              <View style={styles.statusRow}>
                <Text style={styles.label}>Status:</Text>
                <Text style={[
                  styles.statusValue,
                  { color: modelStatus.model_loaded ? '#4CAF50' : '#f44336' }
                ]}>
                  {modelStatus.model_loaded ? '✓ Loaded' : '✗ Not Loaded'}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.label}>Model:</Text>
                <Text style={styles.statusValue}>best.pt</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.label}>Confidence:</Text>
                <Text style={styles.statusValue}>{(modelStatus.confidence_threshold * 100).toFixed(0)}%</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.label}>Loading status...</Text>
          )}
          
          <TouchableOpacity
            style={[styles.button, isReloadingModel && styles.disabledButton]}
            onPress={handleReloadModel}
            disabled={isReloadingModel}
          >
            {isReloadingModel ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>🔄 Reload Model</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Upload Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upload for Analysis</Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={handlePickImage}
            disabled={uploading}
          >
            <Text style={styles.buttonText}>📷 Pick Image</Text>
          </TouchableOpacity>

          {selectedImage && (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.previewImage}
              />
              <TouchableOpacity
                style={[styles.button, uploading && styles.disabledButton]}
                onPress={handleUploadSelectedImage}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>🚀 Upload & Analyze</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={() => setSelectedImage(null)}
                disabled={uploading}
              >
                <Text style={styles.buttonSecondaryText}>✕ Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Setup Parking Spaces Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Setup Parking Spaces</Text>
          <Text style={styles.cardDescription}>
            Use camera to detect and register parking spaces with YOLO-NAS model
          </Text>
          
          <TouchableOpacity
            style={[styles.button, styles.setupButton]}
            onPress={() => navigation && navigation.navigate('AdminParkingSetup')}
          >
            <Text style={styles.buttonText}>🅿️ Configure Spaces</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {results && results.status === 'success' && (
          <View style={styles.resultsCard}>
            <Text style={styles.cardTitle}>📊 Analysis Results</Text>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Total Spaces:</Text>
              <Text style={styles.resultValue}>{results.total_spaces}</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Available:</Text>
              <Text style={[styles.resultValue, { color: '#4CAF50' }]}>
                {results.available_spaces}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Occupied:</Text>
              <Text style={[styles.resultValue, { color: '#f44336' }]}>
                {results.occupied_spaces}
              </Text>
            </View>

            <View style={[styles.resultRow, styles.borderTop]}>
              <Text style={styles.resultLabel}>Occupancy Rate:</Text>
              <Text style={[styles.resultValue, { fontSize: 18, fontWeight: 'bold' }]}>
                {results.occupancy_rate}%
              </Text>
            </View>

            <Text style={styles.detectionCount}>
              {results.detections.length} parking spaces detected
            </Text>
          </View>
        )}

        {results && results.status === 'failed' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>❌ Error</Text>
            <Text style={styles.errorMessage}>{results.error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TabButton 
          label="Upload" 
          icon="📤" 
          active={selectedTab === 'upload'}
          onPress={() => setSelectedTab('upload')}
        />
        <TabButton 
          label="Complexes" 
          icon="🏢" 
          active={selectedTab === 'complex'}
          onPress={() => setSelectedTab('complex')}
        />
        <TabButton 
          label="Bookings" 
          icon="📋" 
          active={selectedTab === 'bookings'}
          onPress={() => setSelectedTab('bookings')}
        />
        <TabButton 
          label="Reports" 
          icon="📈" 
          active={selectedTab === 'reports'}
          onPress={() => setSelectedTab('reports')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  logoutButtonText: {
    color: '#e53e3e',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#DC143C',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  resultsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  errorCard: {
    backgroundColor: '#ffebee',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#DC143C',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  setupButton: {
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: '#999',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonSecondaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  previewContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  previewImage: {
    width: 250,
    height: 250,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  borderTop: {
    borderTopWidth: 2,
    borderTopColor: '#f0f0f0',
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
  },
  resultValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  detectionCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#c62828',
  },

  // Tab Navigation Styles
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 3,
    borderTopColor: 'transparent',
  },
  tabButtonActive: {
    borderTopColor: '#DC143C',
    backgroundColor: '#fafafa',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabIconActive: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#DC143C',
    fontWeight: '700',
  },
});

export default AdminDashboard;
