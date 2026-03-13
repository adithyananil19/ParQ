import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  token: null,
  user: null,
  role: null, // "admin" or "client"
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken(state, action) {
      state.token = action.payload;
    },
    setUser(state, action) {
      state.user = action.payload;
      state.role = action.payload?.role || null;
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
    logout(state) {
      state.token = null;
      state.user = null;
      state.role = null;
      state.error = null;
      state.isLoading = false;
    },
    clearError(state) {
      state.error = null;
    },
  },
});

export const { setToken, setUser, setLoading, setError, logout, clearError } = authSlice.actions;

// Selectors
export const selectToken = (state) => state.auth.token;
export const selectUser = (state) => state.auth.user;
export const selectRole = (state) => state.auth.role;
export const selectIsAdmin = (state) => state.auth.role === 'admin';
export const selectIsClient = (state) => state.auth.role === 'client';
export const selectIsLoading = (state) => state.auth.isLoading;
export const selectError = (state) => state.auth.error;
export const selectIsAuthenticated = (state) => !!state.auth.token;

export default authSlice.reducer;
