import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const API_ENDPOINT = `${API_BASE_URL}/api/v1`;

// Axios instance with timeout for all auth requests
const authClient = axios.create({
  baseURL: API_ENDPOINT,
  timeout: 10000,
});

// Better error extraction
const extractError = (error) => {
  if (error.code === 'ECONNABORTED') return 'Connection timed out. Check your network.';
  if (error.code === 'ERR_NETWORK') return 'Cannot reach server. Make sure backend is running.';
  return error.response?.data?.detail || error.message || 'Request failed';
};

const authService = {
  adminLogin: async (email, password) => {
    try {
      const response = await authClient.post('/auth/admin/login', { email, password });
      return response.data;
    } catch (error) {
      throw new Error(extractError(error));
    }
  },

  clientLogin: async (email, password) => {
    try {
      const response = await authClient.post('/auth/client/login', { email, password });
      return response.data;
    } catch (error) {
      throw new Error(extractError(error));
    }
  },

  clientRegister: async (data) => {
    try {
      const response = await authClient.post('/auth/client/register', {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });
      return response.data;
    } catch (error) {
      throw new Error(extractError(error));
    }
  },

  logout: async () => {
    return { success: true };
  },
};

export default authService;
