import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchOccupancy, bookSpace, fetchComplexes, fetchComplexSlots, createBooking } from '../services/parkingService';

export const getParkingOccupancy = createAsyncThunk(
  'parking/getOccupancy',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchOccupancy();
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const bookParkingSpace = createAsyncThunk(
  'parking/bookSpace',
  async (bookingData, { rejectWithValue }) => {
    try {
      const response = await bookSpace(bookingData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getParkingComplexes = createAsyncThunk(
  'parking/getComplexes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchComplexes();
      return response.complexes || response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getComplexSlots = createAsyncThunk(
  'parking/getComplexSlots',
  async (complexId, { rejectWithValue }) => {
    try {
      const response = await fetchComplexSlots(complexId);
      return response.floors || response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const submitBooking = createAsyncThunk(
  'parking/submitBooking',
  async ({ complexId, bookingData }, { rejectWithValue }) => {
    try {
      const response = await createBooking(complexId, bookingData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const parkingSlice = createSlice({
  name: 'parking',
  initialState: {
    occupancy: null,
    bookings: [],
    currentBooking: null,
    loading: false,
    bookingLoading: false,
    error: null,
    bookingError: null,
    complexes: [],
    complexesLoading: false,
    complexesError: null,
    selectedComplex: null,
    complexSlots: [],
    slotsLoading: false,
  },
  reducers: {
    resetError: (state) => {
      state.error = null;
    },
    resetBookingError: (state) => {
      state.bookingError = null;
    },
    setSelectedComplex: (state, action) => {
      state.selectedComplex = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getParkingOccupancy.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getParkingOccupancy.fulfilled, (state, action) => {
        state.loading = false;
        state.occupancy = action.payload;
      })
      .addCase(getParkingOccupancy.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(bookParkingSpace.pending, (state) => {
        state.bookingLoading = true;
        state.bookingError = null;
      })
      .addCase(bookParkingSpace.fulfilled, (state, action) => {
        state.bookingLoading = false;
        state.currentBooking = action.payload;
        state.bookings.push(action.payload);
      })
      .addCase(bookParkingSpace.rejected, (state, action) => {
        state.bookingLoading = false;
        state.bookingError = action.payload;
      })
      .addCase(getParkingComplexes.pending, (state) => {
        state.complexesLoading = true;
        state.complexesError = null;
      })
      .addCase(getParkingComplexes.fulfilled, (state, action) => {
        state.complexesLoading = false;
        state.complexes = action.payload;
      })
      .addCase(getParkingComplexes.rejected, (state, action) => {
        state.complexesLoading = false;
        state.complexesError = action.payload;
      })
      .addCase(getComplexSlots.pending, (state) => {
        state.slotsLoading = true;
      })
      .addCase(getComplexSlots.fulfilled, (state, action) => {
        state.slotsLoading = false;
        state.complexSlots = action.payload;
      })
      .addCase(getComplexSlots.rejected, (state) => {
        state.slotsLoading = false;
      })
      .addCase(submitBooking.pending, (state) => {
        state.bookingLoading = true;
        state.bookingError = null;
      })
      .addCase(submitBooking.fulfilled, (state, action) => {
        state.bookingLoading = false;
        state.currentBooking = action.payload;
        state.bookings.push(action.payload);
      })
      .addCase(submitBooking.rejected, (state, action) => {
        state.bookingLoading = false;
        state.bookingError = action.payload;
      });
  },
});

export const { resetError, resetBookingError, setSelectedComplex } = parkingSlice.actions;
export default parkingSlice.reducer;
