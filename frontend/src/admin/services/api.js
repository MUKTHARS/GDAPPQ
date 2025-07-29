import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: Platform.OS === 'android' 
    ? 'http://10.150.249.242:8080' 
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
  getSessionRules: (level) => api.get('/admin/rules', { params: { level } }),
  updateSessionRules: (data) => api.post('/admin/rules', data),
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
  getBookings: () => api.get('/admin/bookings'),

createBulkSessions: (data) => {
  return api.post('/admin/sessions/bulk', data, {
    validateStatus: function (status) {
      return status < 500;
    },
    transformRequest: [(data) => {
      const sessions = data.sessions.map(session => ({
        ...session,
        start_time: new Date(session.start_time).toISOString(),
        end_time: new Date(session.end_time).toISOString()
      }));
      return JSON.stringify({ sessions });
    }]
  });
},
  getVenues: () => api.get('/admin/venues'),
  
};

export default api;