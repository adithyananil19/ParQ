let AsyncStorage;

try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  console.warn('AsyncStorage not available:', e);
  AsyncStorage = null;
}

const TOKEN_KEY = 'smartpark_auth_token';
const USER_KEY = 'smartpark_user';

/**
 * Save JWT token to AsyncStorage
 */
export const saveToken = async (token) => {
  if (!AsyncStorage) {
    console.warn('AsyncStorage not available');
    return;
  }
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    console.log('✓ Token saved to AsyncStorage');
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

/**
 * Retrieve JWT token from AsyncStorage
 */
export const getToken = async () => {
  if (!AsyncStorage) {
    console.warn('AsyncStorage not available');
    return null;
  }
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('Error retrieving token:', error);
    return null;
  }
};

/**
 * Save user profile to AsyncStorage
 */
export const saveUser = async (user) => {
  if (!AsyncStorage) {
    console.warn('AsyncStorage not available');
    return;
  }
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    console.log('✓ User saved to AsyncStorage');
  } catch (error) {
    console.error('Error saving user:', error);
  }
};

/**
 * Retrieve user profile from AsyncStorage
 */
export const getUser = async () => {
  if (!AsyncStorage) {
    console.warn('AsyncStorage not available');
    return null;
  }
  try {
    const userStr = await AsyncStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error retrieving user:', error);
    return null;
  }
};

/**
 * Clear all authentication data (logout)
 */
export const clearAuth = async () => {
  if (!AsyncStorage) {
    console.warn('AsyncStorage not available');
    return;
  }
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    console.log('✓ Auth data cleared from AsyncStorage');
  } catch (error) {
    console.error('Error clearing auth:', error);
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async () => {
  const token = await getToken();
  return !!token;
};
