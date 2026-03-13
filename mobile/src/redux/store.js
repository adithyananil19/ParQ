import { configureStore } from '@reduxjs/toolkit';
import parkingReducer from './parkingSlice';
import authReducer from './authSlice';
import setupReducer from './setupSlice';

export const store = configureStore({
  reducer: {
    parking: parkingReducer,
    auth: authReducer,
    setup: setupReducer,
  },
});

export default store;
