import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  setupMode: {
    lotId: 'lot_123', // Default lot, can be changed by user
    collectedSpaces: [], // Array of {space_id, polygon, confidence, space_class}
    currentPolygon: null, // Currently displayed detected polygon
    currentSpaceId: 0, // Running counter for space IDs
    editMode: false, // Whether user is editing polygon corners
    selectedCornerIndex: null, // Which corner is being dragged
    isLoading: false,
    error: null,
    message: '',
    cameraReady: false,
    detectionInProgress: false,
  },
};

const setupSlice = createSlice({
  name: 'setup',
  initialState,
  reducers: {
    // Initialize setup mode
    initializeSetup: (state, action) => {
      state.setupMode.lotId = action.payload.lotId || 'lot_123';
      state.setupMode.collectedSpaces = [];
      state.setupMode.currentSpaceId = 0;
      state.setupMode.error = null;
    },

    // Set lot ID
    setLotId: (state, action) => {
      state.setupMode.lotId = action.payload;
    },

    // Set detected polygon from API
    setCurrentPolygon: (state, action) => {
      state.setupMode.currentPolygon = action.payload;
      state.setupMode.detectionInProgress = false;
    },

    // Clear current polygon
    clearCurrentPolygon: (state) => {
      state.setupMode.currentPolygon = null;
      state.setupMode.selectedCornerIndex = null;
    },

    // Confirm and add space to collection
    confirmCurrentSpace: (state) => {
      if (state.setupMode.currentPolygon && state.setupMode.currentPolygon.found) {
        const newSpace = {
          space_id: state.setupMode.currentSpaceId + 1,
          polygon: state.setupMode.currentPolygon.polygon,
          confidence: state.setupMode.currentPolygon.confidence,
          space_class: state.setupMode.currentPolygon.space_class,
        };

        state.setupMode.collectedSpaces.push(newSpace);
        state.setupMode.currentSpaceId += 1;
        state.setupMode.currentPolygon = null;
        state.setupMode.message = `Space #${newSpace.space_id} confirmed`;
      }
    },

    // Skip current detection
    skipCurrentDetection: (state) => {
      state.setupMode.currentPolygon = null;
      state.setupMode.message = 'Detection skipped, try again';
    },

    // Toggle edit mode
    toggleEditMode: (state) => {
      state.setupMode.editMode = !state.setupMode.editMode;
    },

    // Select corner for editing
    selectCorner: (state, action) => {
      state.setupMode.selectedCornerIndex = action.payload;
    },

    // Deselect corner
    deselectCorner: (state) => {
      state.setupMode.selectedCornerIndex = null;
    },

    // Update corner position (dragging)
    updateCornerPosition: (state, action) => {
      if (
        state.setupMode.currentPolygon &&
        state.setupMode.selectedCornerIndex !== null
      ) {
        const { x, y } = action.payload;
        const corner = state.setupMode.currentPolygon.polygon[state.setupMode.selectedCornerIndex];
        if (corner) {
          corner[0] = x;
          corner[1] = y;
        }
      }
    },

    // Update corner position in collected space
    updateCollectedSpaceCorner: (state, action) => {
      const { spaceIndex, cornerIndex, x, y } = action.payload;
      if (state.setupMode.collectedSpaces[spaceIndex]) {
        const corner = state.setupMode.collectedSpaces[spaceIndex].polygon[cornerIndex];
        if (corner) {
          corner[0] = x;
          corner[1] = y;
        }
      }
    },

    // Remove space from collection
    removeSpace: (state, action) => {
      const index = action.payload;
      state.setupMode.collectedSpaces.splice(index, 1);
    },

    // Camera ready
    setCameraReady: (state, action) => {
      state.setupMode.cameraReady = action.payload;
    },

    // Loading state
    setLoading: (state, action) => {
      state.setupMode.isLoading = action.payload;
    },

    // Detection in progress
    setDetectionInProgress: (state, action) => {
      state.setupMode.detectionInProgress = action.payload;
    },

    // Error handling
    setError: (state, action) => {
      state.setupMode.error = action.payload;
      state.setupMode.isLoading = false;
    },

    // Set message
    setMessage: (state, action) => {
      state.setupMode.message = action.payload;
    },

    // Clear error
    clearError: (state) => {
      state.setupMode.error = null;
    },

    // Reset all
    resetSetup: (state) => {
      state.setupMode = initialState.setupMode;
    },

    // Clear collected spaces
    clearCollectedSpaces: (state) => {
      state.setupMode.collectedSpaces = [];
      state.setupMode.currentSpaceId = 0;
      state.setupMode.message = 'All spaces cleared';
    },
  },
});

export const {
  initializeSetup,
  setLotId,
  setCurrentPolygon,
  clearCurrentPolygon,
  confirmCurrentSpace,
  skipCurrentDetection,
  toggleEditMode,
  selectCorner,
  deselectCorner,
  updateCornerPosition,
  updateCollectedSpaceCorner,
  removeSpace,
  setCameraReady,
  setLoading,
  setDetectionInProgress,
  setError,
  setMessage,
  clearError,
  resetSetup,
  clearCollectedSpaces,
} = setupSlice.actions;

export default setupSlice.reducer;
