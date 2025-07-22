import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: Platform.OS === 'android' 
    ? 'http://10.0.2.2:8080' 
    : 'http://localhost:8080',
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      const cleanToken = token.replace(/['"]+/g, '').trim();
      config.headers.Authorization = `Bearer ${cleanToken}`;
    } else {
      // Don't throw error, just continue without token
      console.log('No token available - proceeding without authorization');
    }
  } catch (error) {
    console.error('Error getting token:', error);
    // Don't throw error, just continue without token
  }
  return config;
}, error => {
  return Promise.reject(error);
});


api.interceptors.response.use(response => {
  console.log('Response received:', {
    status: response.status,
    url: response.config.url
  });
  return response;
}, error => {
  console.error('API Error:', {
    message: error.message,
    response: error.response?.data,
    status: error.response?.status
  });
  return Promise.reject(error);
});
///////dfgvfed
api.student = {
  login: (email, password) => api.post('/student/login', { email, password }),
  getSessions: (level) => api.get(`/student/sessions?level=${level}`),
  bookVenue: (venueId) => api.post('/student/sessions/book', { venue_id: venueId }),
  joinSession: (qrData) => api.post('/student/sessions/join', { qr_data: qrData })
};

export default api;
