import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: Platform.OS === 'android' 
    ? 'http://10.0.2.2:8080' 
    : 'http://localhost:8080',
});

api.interceptors.request.use(async (config) => {
  console.log('Making request to:', config.url);
  const token = await AsyncStorage.getItem('token');
  if (token) {
    console.log('Adding auth token to headers');
    const cleanToken = token.replace(/^"(.*)"$/, '$1');
    config.headers.Authorization = `Bearer ${cleanToken}`;
  }
  return config;
}, error => {
  console.error('Request error:', error);
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

api.student = {
  login: (email, password) => api.post('/student/login', { email, password }),
  getSessions: (level) => api.get(`/student/sessions?level=${level}`),
  joinSession: (qrData) => api.post('/student/sessions/join', { qr_data: qrData })
};

export default api;

// import axios from 'axios';
// import { Platform } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const api = axios.create({
//   baseURL: Platform.OS === 'android' 
//     ? 'http://10.0.2.2:8080' 
//     : 'http://localhost:8080',
// });

// api.interceptors.request.use(async (config) => {
//   const token = await AsyncStorage.getItem('token');
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

// api.student = {
//   login: (email, password) => api.post('/student/login', { email, password }),
//   getSessions: (level) => api.get(`/student/sessions?level=${level}`),
//   joinSession: (qrData) => api.post('/student/sessions/join', { qr_data: qrData })
// };

// export default api;