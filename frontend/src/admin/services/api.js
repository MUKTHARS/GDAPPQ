import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: Platform.OS === 'android' 
    ? 'http://10.0.2.2:8080' 
    : 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Add these API endpoints
api.admin = {
  getVenues: () => api.get('/admin/venues'),
   generateQR: (venueId) => api.get('/admin/qr', { 
    params: { 
      venue_id: venueId 
    },
    validateStatus: function (status) {
      return status >= 200 && status < 500;
    },
    timeout: 15000
  }),
  updateVenue: (id, data) => api.put(`/admin/venues/${id}`, data),
  createVenue: (data) => api.post('/admin/venues', data),
  getBookings: () => api.get('/admin/bookings')
};

export default api;