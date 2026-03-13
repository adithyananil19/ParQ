// API Configuration
// Use your machine's local IP to connect from phone

export const API_BASE_URL = 'http://192.168.1.4:8000';  // Your machine's local Ethernet IP

// Helper function to make API requests
export const makeRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API request failed (${endpoint}):`, error);
    throw error;
  }
};
