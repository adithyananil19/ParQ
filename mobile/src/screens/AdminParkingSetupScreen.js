import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import SVG, { Polygon as SVGPolygon, Circle as SVGCircle } from 'react-native-svg';
import { API_BASE_URL } from '../config/api';
import { setLoading, setError, setMessage, clearError } from '../redux/setupSlice';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const IMAGE_DISPLAY_HEIGHT = screenHeight * 0.55;

const AdminParkingSetupScreenNew = ({ navigation }) => {
  // Redux dispatch
  const dispatch = useDispatch();
  
  // State management
  const token = useSelector(state => state.auth.token);
  const user = useSelector(state => state.auth.user);
  const [complexName, setComplexName] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [originalImageDimensions, setOriginalImageDimensions] = useState(null);
  const [detectedPolygons, setDetectedPolygons] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPolygonIndex, setEditingPolygonIndex] = useState(null);
  const [step, setStep] = useState('upload'); // upload | edit | confirm
  const [spaceNames, setSpaceNames] = useState({}); // Track custom names for each space
  const [columnsPerRow, setColumnsPerRow] = useState(null); // Columns for table layout
  const [rows, setRows] = useState(['A']); // Row labels: ['A', 'B', 'C', ...]
  const [tableLayout, setTableLayout] = useState({}); // {rowA: {0: spaceId, 1: spaceId}, rowB: {...}}
  const [showColumnsPrompt, setShowColumnsPrompt] = useState(false); // Show initial columns input
  const [tempColumns, setTempColumns] = useState(''); // Temporary input for columns
  const imageRef = useRef(null);

  // Verify authentication on mount
  useEffect(() => {
    console.log('=============================');
    console.log('AdminParkingSetupScreen mounted');
    console.log('=============================');
    console.log('Token from Redux:', token ? `${token.substring(0, 30)}...` : 'NULL');
    console.log('User from Redux:', user?.email || 'NULL');
    console.log('User role:', user?.role || 'NULL');
    console.log('=============================');
    
    if (!token || !user) {
      console.warn('AUTHENTICATION MISSING - redirecting');
      dispatch(setError('Authentication required. Please login as admin.'));
      setTimeout(() => navigation.goBack(), 2000);
    }
  }, [token, user, navigation, dispatch]);

  // Initialize space names when moving to Step 4
  useEffect(() => {
    if (step === 'confirm' && detectedPolygons.length > 0 && Object.keys(spaceNames).length === 0) {
      const initialNames = {};
      detectedPolygons.forEach((_, idx) => {
        initialNames[idx] = `Lot${idx + 1}`;
      });
      setSpaceNames(initialNames);
    }
  }, [step, detectedPolygons]);

  // Initialize table layout when entering Step 4
  const initializeTableLayout = (cols) => {
    setColumnsPerRow(cols);
    setRows(['A']);
    setTableLayout({ 'rowA': {} });
    setShowColumnsPrompt(false);
  };

  // Get spaces in dashboard (not yet placed in table)
  const getDashboardSpaces = () => {
    const placedSpaceIds = new Set();
    Object.values(tableLayout).forEach(row => {
      Object.values(row).forEach(spaceId => {
        if (spaceId !== null) placedSpaceIds.add(spaceId);
      });
    });
    return detectedPolygons.map((_, idx) => idx).filter(idx => !placedSpaceIds.has(idx));
  };

  // Drop space into table
  const handleDropSpace = (spaceIdx, rowKey, col) => {
    const newLayout = JSON.parse(JSON.stringify(tableLayout));
    if (!newLayout[rowKey]) newLayout[rowKey] = {};
    newLayout[rowKey][col] = spaceIdx;
    setTableLayout(newLayout);
  };

  // Remove space from table (back to dashboard)
  const handleRemoveSpace = (rowKey, col) => {
    const newLayout = JSON.parse(JSON.stringify(tableLayout));
    if (newLayout[rowKey]) {
      delete newLayout[rowKey][col];
    }
    setTableLayout(newLayout);
  };

  // Add new row
  const handleAddRow = () => {
    const nextRow = String.fromCharCode(65 + rows.length); // A=65, B=66, etc.
    if (nextRow.charCodeAt(0) <= 90) { // Up to Z
      setRows([...rows, nextRow]);
      setTableLayout({...tableLayout, [`row${nextRow}`]: {}});
    }
  };

  // Get space display name for table
  const getSpaceName = (spaceIdx) => {
    return spaceNames[spaceIdx] || `Lot${spaceIdx + 1}`;
  };

  // Handle image selection
  const handleSelectImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const image = result.assets[0];
        setSelectedImage({
          uri: image.uri,
          base64: image.base64,
          width: image.width,
          height: image.height,
        });
        setOriginalImageDimensions({
          width: image.width,
          height: image.height,
        });
        setDetectedPolygons([]);
        dispatch(clearError());
        setStep('detect');
      }
    } catch (error) {
      dispatch(setError('Failed to pick image: ' + error.message));
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  };

  // Auto-detect parking spaces using the backend model
  const handleDetectSpaces = async () => {
    console.log('=============================');
    console.log('handleDetectSpaces called');
    console.log('=============================');
    
    if (!selectedImage || !selectedImage.base64) {
      console.error('No image selected');
      dispatch(setError('No image selected'));
      Alert.alert('Error', 'No image selected');
      return;
    }

    console.log('Step 1: Image validation - PASSED');
    console.log('  Image URI:', selectedImage.uri?.substring(0, 50) + '...');
    console.log('  Image size:', selectedImage.width, 'x', selectedImage.height);

    console.log('Step 2: Checking token...');
    console.log('  Token value:', token ? `"${token.substring(0, 40)}..."` : 'NULL');
    console.log('  Token truthy:', !!token);
    
    if (!token) {
      console.error('TOKEN IS NULL - Cannot proceed');
      dispatch(setError('Authentication required. Please login again.'));
      Alert.alert('Error', 'Authentication required. Please login again.');
      return;
    }
    
    console.log('Step 2: Token validation - PASSED');

    setIsDetecting(true);
    dispatch(setLoading(true));

    try {
      const uploadURL = `${API_BASE_URL}/api/v1/parking/upload-image`;
      const authHeader = `Bearer ${token}`;
      
      console.log('Step 3: Request config');
      console.log('  URL:', uploadURL);
      console.log('  Auth Header:', `${authHeader.substring(0, 40)}...`);

      // Create FormData directly with image URI (React Native way)
      const formData = new FormData();
      
      // For React Native, append the URI directly to FormData
      formData.append('file', {
        uri: selectedImage.uri,
        type: 'image/jpeg',
        name: 'parking_lot.jpg',
      });
      
      console.log('Step 3b: FormData constructed with URI');
      console.log('  Image URI:', selectedImage.uri.substring(0, 50) + '...');

      console.log('Step 4: Sending fetch request...');
      
      // Use fetch with FormData
      const uploadResponse = await fetch(uploadURL, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
        },
        body: formData,
      });
      
      console.log('Step 4b: Fetch response received');
      console.log('  Status:', uploadResponse.status);
      console.log('  StatusText:', uploadResponse.statusText);
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('  Error response body:', errorText);
        throw new Error(`HTTP Error: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }
      
      const response = {
        status: uploadResponse.status,
        data: await uploadResponse.json(),
      };

      console.log('Step 5: Response received!');
      console.log('  Status:', response.status);
      console.log('  Data keys:', Object.keys(response.data).join(', '));

      if (response.data && response.data.detections && Array.isArray(response.data.detections)) {
        // Convert detections to polygon format
        const polygons = response.data.detections.map((detection, idx) => ({
          id: idx,
          box: detection.box,
          confidence: detection.confidence,
          occupied: detection.occupied,
          status: detection.status,
          corners: [
            [detection.box.x1, detection.box.y1],
            [detection.box.x2, detection.box.y1],
            [detection.box.x2, detection.box.y2],
            [detection.box.x1, detection.box.y2],
          ],
        }));

        console.log(`SUCCESS: Detected ${polygons.length} parking spaces`);
        setDetectedPolygons(polygons);
        setStep('edit');
        dispatch(setMessage(`Detected ${polygons.length} parking spaces!`));
        Alert.alert('Success', `Detected ${polygons.length} parking spaces!`);
      } else {
        const errorMsg = response.data?.detail || response.data?.error || response.data?.message || 'Invalid response format';
        console.error('Invalid detection response:', response.data);
        dispatch(setError(errorMsg));
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      console.error('=============================');
      console.error('CATCH BLOCK - Error occurred');
      console.error('=============================');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack?.substring(0, 200) || 'N/A');
      
      let errorMsg = 'Failed to detect parking spaces';
      
      // Check if it's a network/fetch error
      if (error.message?.includes('Network') || error.message?.includes('TypeError')) {
        errorMsg = 'Network error. Cannot reach backend at ' + API_BASE_URL + '. Make sure:\n1. Backend is running\n2. Device can reach the server IP\n3. Network allows the connection';
      } else if (error.message?.includes('HTTP Error: 401')) {
        errorMsg = 'Authentication failed (401). Token may be invalid. Please logout and login again.';
      } else if (error.message?.includes('HTTP Error: 403')) {
        errorMsg = 'Permission denied (403). You do not have admin access.';
      } else if (error.message?.includes('HTTP Error: 422')) {
        errorMsg = 'Invalid image (422). Use JPG, PNG, or BMP format.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      console.error('Final error message:', errorMsg);
      dispatch(setError(errorMsg));
      Alert.alert('Error', errorMsg);
    } finally {
      console.log('Cleanup: Setting detecting/loading to false');
      setIsDetecting(false);
      dispatch(setLoading(false));
    }
  };

  // Scale coordinates from original image to display size (accounting for resizeMode="contain")
  const scaleCoordinates = (coords) => {
    if (!originalImageDimensions || !selectedImage) return coords;
    
    // Calculate aspect ratios
    const imageAspectRatio = originalImageDimensions.width / originalImageDimensions.height;
    const containerAspectRatio = screenWidth / IMAGE_DISPLAY_HEIGHT;
    
    let displayWidth, displayHeight, offsetX, offsetY;
    
    if (imageAspectRatio > containerAspectRatio) {
      // Image is wider than container - fit to width, center vertically
      displayWidth = screenWidth;
      displayHeight = screenWidth / imageAspectRatio;
      offsetX = 0;
      offsetY = (IMAGE_DISPLAY_HEIGHT - displayHeight) / 2;
    } else {
      // Image is taller than container - fit to height, center horizontally
      displayHeight = IMAGE_DISPLAY_HEIGHT;
      displayWidth = IMAGE_DISPLAY_HEIGHT * imageAspectRatio;
      offsetX = (screenWidth - displayWidth) / 2;
      offsetY = 0;
    }
    
    const scaleX = displayWidth / originalImageDimensions.width;
    const scaleY = displayHeight / originalImageDimensions.height;
    
    return coords.map(([x, y]) => [x * scaleX + offsetX, y * scaleY + offsetY]);
  };

  // Update polygon corner position
  const updateCornerPosition = (polygonIdx, cornerIdx, newX, newY) => {
    const updatedPolygons = [...detectedPolygons];
    updatedPolygons[polygonIdx].corners[cornerIdx] = [newX, newY];
    setDetectedPolygons(updatedPolygons);
  };

  // Remove a polygon
  const removePolygon = (idx) => {
    setDetectedPolygons(detectedPolygons.filter((_, i) => i !== idx));
  };

  // Save all polygons to Firebase
  const handleSaveLayout = async () => {
    if (detectedPolygons.length === 0) {
      dispatch(setError('Please detect and confirm at least one parking space'));
      Alert.alert('Error', 'Please detect and confirm at least one parking space');
      return;
    }

    if (!complexName.trim()) {
      dispatch(setError('Please enter parking complex name'));
      Alert.alert('Error', 'Please enter parking complex name');
      return;
    }

    setIsSaving(true);
    dispatch(setLoading(true));

    try {
      const spacesData = detectedPolygons.map((polygon, idx) => {
        // Find which row and column this space is in
        let position = `Lot${idx + 1}`;
        for (const [rowKey, rowData] of Object.entries(tableLayout)) {
          for (const [colIdx, spaceId] of Object.entries(rowData)) {
            if (spaceId === idx) {
              const rowLabel = rowKey.replace('row', '');
              position = `${rowLabel}${parseInt(colIdx) + 1}`;
            }
          }
        }

        return {
          space_id: `space_${idx + 1}`,
          name: position,
          polygon: polygon.corners,
          confidence: polygon.confidence,
          status: polygon.status,
        };
      });

      // TODO: Replace with actual Firebase/backend API call to save
      // await saveParkingLayout(complexName, spacesData);

      console.log('Saving layout for complex:', complexName);
      console.log('Spaces:', spacesData);

      const successMsg = `Parking layout saved for "${complexName}"!\nTotal spaces: ${spacesData.length}`;
      dispatch(setMessage(successMsg));

      Alert.alert('Success', successMsg, [
        {
          text: 'OK',
          onPress: () => {
            // Reset and go back
            setComplexName('');
            setSelectedImage(null);
            setDetectedPolygons([]);
            setSpaceNames({});
            setColumnsPerRow(null);
            setRows(['A']);
            setTableLayout({});
            setTempColumns('');
            setStep('upload');
            dispatch(clearError());
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error('Save error:', error);
      const errorMsg = 'Failed to save parking layout: ' + error.message;
      dispatch(setError(errorMsg));
      Alert.alert('Error', errorMsg);
    } finally {
      setIsSaving(false);
      dispatch(setLoading(false));
    }
  };

  // Render polygon overlay with editable corners
  const renderPolygonOverlay = () => {
    return (
      <SVG style={styles.overlay} width={screenWidth} height={IMAGE_DISPLAY_HEIGHT}>
        {detectedPolygons.map((polygon, polyIdx) => {
          const scaledCorners = scaleCoordinates(polygon.corners);
          const points = scaledCorners.map(([x, y]) => `${x},${y}`).join(' ');
          const isEditing = editingPolygonIndex === polyIdx;

          return (
            <View key={`polygon-${polyIdx}`}>
              {/* Polygon fill and stroke */}
              <SVGPolygon
                points={points}
                fill={isEditing ? 'rgba(255, 100, 100, 0.2)' : 'rgba(100, 255, 100, 0.15)'}
                stroke={isEditing ? 'red' : 'green'}
                strokeWidth={isEditing ? '3' : '2'}
              />

              {/* Corner points - draggable circles */}
              {scaledCorners.map(([x, y], cornerIdx) => (
                <TouchableOpacity
                  key={`corner-${polyIdx}-${cornerIdx}`}
                  onPress={() => setEditingPolygonIndex(polyIdx)}
                  style={{
                    position: 'absolute',
                    left: x - 8,
                    top: y - 8,
                    width: 16,
                    height: 16,
                  }}
                >
                  <SVGCircle
                    cx={x}
                    cy={y}
                    r={isEditing ? 7 : 5}
                    fill={isEditing ? 'yellow' : 'white'}
                    stroke={isEditing ? 'orange' : 'blue'}
                    strokeWidth={isEditing ? '2' : '1'}
                  />
                </TouchableOpacity>
              ))}

              {/* Info label */}
              <Text
                style={{
                  position: 'absolute',
                  left: scaledCorners[0][0],
                  top: scaledCorners[0][1] - 20,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  paddingHorizontal: 5,
                  paddingVertical: 2,
                  borderRadius: 3,
                  fontSize: 10,
                }}
              >
                #{polyIdx + 1}
              </Text>
            </View>
          );
        })}
      </SVG>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>&lt; Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Setup Parking Spaces</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* STEP 1: Upload Image */}
        {step === 'upload' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step 1: Select Parking Lot Image</Text>
            <Text style={styles.sectionDescription}>
              Upload a screenshot of your parking lot to detect spaces automatically.
            </Text>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleSelectImage}
            >
              <Text style={styles.uploadButtonText}>📷 Select Image from Gallery</Text>
            </TouchableOpacity>

            {selectedImage && (
              <View style={styles.imagePreview}>
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.previewImage}
                />
                <Text style={styles.previewText}>
                  {selectedImage.width} x {selectedImage.height}px
                </Text>
              </View>
            )}
          </View>
        )}

        {/* STEP 2: Auto-Detect Spaces */}
        {step === 'detect' && selectedImage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step 2: Auto-Detect Parking Spaces</Text>
            
            <TouchableOpacity
              style={[styles.primaryButton, isDetecting && styles.disabledButton]}
              onPress={handleDetectSpaces}
              disabled={isDetecting}
            >
              {isDetecting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.primaryButtonText}>🤖 Detect Spaces</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.helperText}>
              The model will analyze your image and draw polygons around detected parking spaces.
            </Text>
          </View>
        )}

        {/* STEP 3: Edit & Confirm Detections */}
        {step === 'edit' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step 3: Review & Edit Detections</Text>

            {/* Image with polygon overlay */}
            <View style={styles.imageContainer}>
              <Image
                ref={imageRef}
                source={{ uri: selectedImage.uri }}
                style={styles.displayImage}
                resizeMode="contain"
              />
              {renderPolygonOverlay()}
            </View>

            {/* Detected polygons list */}
            <Text style={styles.countText}>
              Detected: {detectedPolygons.length} spaces
            </Text>

            <ScrollView style={styles.polygonsList} nestedScrollEnabled>
              {detectedPolygons.map((polygon, idx) => (
                <View key={`poly-item-${idx}`} style={styles.polygonItem}>
                  <View style={styles.polygonInfo}>
                    <Text style={styles.polygonNumber}>Space #{idx + 1}</Text>
                    <Text style={styles.polygonConfidence}>
                      Confidence: {(polygon.confidence * 100).toFixed(1)}%
                    </Text>
                    <Text style={styles.polygonStatus}>
                      Status: {polygon.status}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removePolygon(idx)}
                  >
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 0.3 }]}
                onPress={() => {
                  console.log('Add button pressed');
                }}
              >
                <Text style={styles.secondaryButtonText}>+ Add</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 0.3, marginHorizontal: 8 }]}
                onPress={() => {
                  console.log('Edit button pressed');
                }}
              >
                <Text style={styles.secondaryButtonText}>✎ Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { flex: 0.35 },
                  detectedPolygons.length === 0 && styles.disabledButton,
                ]}
                onPress={() => setStep('confirm')}
                disabled={detectedPolygons.length === 0}
              >
                <Text style={styles.primaryButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 4: Drag & Drop Naming */}
        {step === 'confirm' && (
          <View style={styles.section}>
            {/* Initial columns prompt */}
            {!columnsPerRow ? (
              <View style={styles.columnsPromptContainer}>
                <Text style={styles.columnsPromptTitle}>Configure Table Layout</Text>
                <Text style={styles.columnsPromptDesc}>
                  How many parking spaces per row? (e.g., 3, 4, 6)
                </Text>
                <TextInput
                  style={styles.columnsInput}
                  placeholder="Enter number"
                  keyboardType="number-pad"
                  value={tempColumns}
                  onChangeText={setTempColumns}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  style={styles.confirmColumnsBtn}
                  onPress={() => {
                    if (tempColumns && parseInt(tempColumns) > 0) {
                      initializeTableLayout(parseInt(tempColumns));
                      setTempColumns('');
                    } else {
                      Alert.alert('Error', 'Please enter a valid number');
                    }
                  }}
                >
                  <Text style={styles.confirmColumnsBtnText}>Proceed</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Step 4: Arrange Spaces by Row</Text>

                {/* Image preview */}
                <View style={styles.imageContainer}>
                  <Image
                    ref={imageRef}
                    source={{ uri: selectedImage.uri }}
                    style={styles.displayImage}
                    resizeMode="contain"
                  />
                  {renderPolygonOverlay()}
                </View>

                {/* Dashboard - Available spaces */}
                {getDashboardSpaces().length > 0 && (
                  <View style={styles.dashboardSection}>
                    <Text style={styles.dashboardTitle}>Available Spaces (Tap to place)</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.dashboardScroll}
                    >
                      <View style={styles.dashboardTiles}>
                        {getDashboardSpaces().map((spaceIdx) => (
                          <TouchableOpacity
                            key={`dash-${spaceIdx}`}
                            style={styles.dashboardTile}
                            onPress={() => {
                              // Show modal or row selection for placement
                              Alert.alert(
                                'Select Row',
                                `Place Space #${spaceIdx + 1} in which row?`,
                                rows.map((row) => ({
                                  text: row,
                                  onPress: () => {
                                    // Find first empty slot in that row
                                    const rowKey = `row${row}`;
                                    const rowData = tableLayout[rowKey] || {};
                                    for (let col = 0; col < columnsPerRow; col++) {
                                      if (rowData[col] === undefined) {
                                        handleDropSpace(spaceIdx, rowKey, col);
                                        break;
                                      }
                                    }
                                  },
                                })),
                                [{ text: 'Cancel' }]
                              );
                            }}
                          >
                            <Text style={styles.tileBadge}>#{spaceIdx + 1}</Text>
                            <Text style={styles.tileName}>{getSpaceName(spaceIdx)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* Table with rows */}
                <ScrollView style={styles.tableContainer} nestedScrollEnabled>
                  {rows.map((rowLabel, rowIdx) => {
                    const rowKey = `row${rowLabel}`;
                    const rowData = tableLayout[rowKey] || {};
                    const cols = Array(columnsPerRow)
                      .fill(null)
                      .map((_, colIdx) => rowData[colIdx] ?? null);

                    return (
                      <View key={`row-${rowLabel}`} style={styles.tableRow}>
                        <Text style={styles.rowLabel}>{rowLabel}</Text>
                        <View style={styles.rowCells}>
                          {cols.map((spaceId, colIdx) => (
                            <View
                              key={`cell-${rowLabel}-${colIdx}`}
                              style={styles.tableCell}
                            >
                              {spaceId !== null ? (
                                <TouchableOpacity
                                  style={styles.placedTile}
                                  onLongPress={() =>
                                    Alert.alert(
                                      'Remove Space',
                                      `Remove Space #${spaceId + 1} from ${rowLabel}${colIdx + 1}?`,
                                      [
                                        {
                                          text: 'Remove',
                                          onPress: () => handleRemoveSpace(rowKey, colIdx),
                                          style: 'destructive',
                                        },
                                        { text: 'Cancel' },
                                      ]
                                    )
                                  }
                                >
                                  <Text style={styles.cellTileBadge}>#{spaceId + 1}</Text>
                                  <Text style={styles.cellTileName} numberOfLines={1}>
                                    {rowLabel}
                                    {colIdx + 1}
                                  </Text>
                                </TouchableOpacity>
                              ) : (
                                <View style={styles.emptyCell}>
                                  <Text style={styles.emptyCellText}>—</Text>
                                </View>
                              )}
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                {/* Instruction text */}
                <Text style={styles.tableInstruction}>
                  💡 Long-press any tile to remove it from the table
                </Text>

                {/* Add Row button */}
                {rows.length < 26 && (
                  <TouchableOpacity
                    style={styles.addRowBtn}
                    onPress={handleAddRow}
                  >
                    <Text style={styles.addRowBtnText}>+ Add Row</Text>
                  </TouchableOpacity>
                )}

                {/* Parking Complex Name */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Parking Complex Name:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Downtown Plaza"
                    value={complexName}
                    onChangeText={setComplexName}
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Action buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { flex: 0.45 }]}
                    onPress={() => setStep('edit')}
                  >
                    <Text style={styles.secondaryButtonText}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      { flex: 0.45 },
                      (!complexName.trim() || getDashboardSpaces().length === detectedPolygons.length) &&
                        styles.disabledButton,
                    ]}
                    onPress={handleSaveLayout}
                    disabled={!complexName.trim() || getDashboardSpaces().length === detectedPolygons.length}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Save Layout</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginTop: 10,
  },
  backButton: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  uploadButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreview: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginBottom: 8,
  },
  previewText: {
    color: '#999',
    fontSize: 12,
  },
  imageContainer: {
    width: '100%',
    height: IMAGE_DISPLAY_HEIGHT,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  displayImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  countText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 10,
  },
  polygonsList: {
    maxHeight: 150,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 16,
    paddingTop: 8,
  },
  polygonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  polygonInfo: {
    flex: 1,
  },
  polygonNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  polygonConfidence: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  polygonStatus: {
    fontSize: 12,
    color: '#999',
    marginTop: 1,
  },
  removeBtn: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ef5350',
  },
  removeBtnText: {
    color: '#d32f2f',
    fontSize: 11,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  helperText: {
    marginTop: 12,
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  // Step 4 - Drag & Drop Styles
  columnsPromptContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  columnsPromptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  columnsPromptDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  columnsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
    width: '80%',
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  confirmColumnsBtn: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  confirmColumnsBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dashboardSection: {
    marginVertical: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dashboardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dashboardScroll: {
    maxHeight: 100,
  },
  dashboardTiles: {
    flexDirection: 'row',
    paddingRight: 12,
  },
  dashboardTile: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#2196F3',
    minWidth: 80,
    alignItems: 'center',
  },
  tileBadge: {
    backgroundColor: '#2196F3',
    color: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  tileName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    textAlign: 'center',
  },
  tableContainer: {
    flex: 0,
    maxHeight: 400,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
    height: 80,
  },
  rowLabel: {
    width: 40,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    textAlignVertical: 'center',
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  rowCells: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  tableCell: {
    flex: 1,
    margin: 2,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    height: 72,
  },
  emptyCell: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  emptyCellText: {
    fontSize: 20,
    color: '#ccc',
    fontWeight: '300',
  },
  placedTile: {
    backgroundColor: '#C8E6C9',
    borderRadius: 4,
    padding: 4,
    borderWidth: 1,
    borderColor: '#4CAF50',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellTileBadge: {
    backgroundColor: '#4CAF50',
    color: 'white',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    fontSize: 10,
    fontWeight: '700',
  },
  cellTileName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
    marginTop: 2,
  },
  cellTileNote: {
    fontSize: 8,
    color: '#999',
    marginTop: 2,
    fontStyle: 'italic',
  },
  tableInstruction: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 8,
    textAlign: 'center',
  },
  addRowBtn: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 12,
  },
  addRowBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AdminParkingSetupScreenNew;
