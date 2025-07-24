import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: Platform.OS === 'android' 
    ? 'http://10.150.249.242:8080' 
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
  // Skip logging for 403 errors on booking attempts
  if (error.response?.status !== 403 || !error.config.url.includes('/student/sessions/book')) {
    console.error('API Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
  }
  return Promise.reject(error);
});

api.student = {
  login: (email, password) => api.post('/student/login', { email, password }),
  getSessions: (level) => api.get(`/student/sessions?level=${level}`),
    joinSession: (data) => api.post('/student/sessions/join', data, {
    validateStatus: function (status) {
      return true; // Always resolve to handle all status codes
    },
    transformResponse: [
      function (data) {
        try {
          // Handle case where backend might return plain text error
          if (typeof data === 'string' && data.includes('error')) {
            return { error: data };
          }
          return JSON.parse(data);
        } catch (e) {
          return { error: 'Invalid server response' };
        }
      }
    ]
  }),
  // joinSession: (qrData) => api.post('/student/sessions/join', { qr_data: qrData }),
  bookVenue: (venueId) => api.post('/student/sessions/book', { venue_id: venueId }),
  checkBooking: (venueId) => api.get('/student/session/check', { params: { venue_id: venueId } }),
  cancelBooking: (venueId) => api.delete('/student/session/cancel', { data: { venue_id: venueId } })
};

export default api;
