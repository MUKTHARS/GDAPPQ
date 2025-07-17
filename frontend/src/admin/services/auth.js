// auth.js
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default {
  login: async (email, password) => {
    try {
      const response = await api.post('admin/login', { 
        email, 
        password 
      });
      
      if (!response.data.token) {
        throw new Error('No token received');
      }

      await AsyncStorage.setItem('token', response.data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },
  
  logout: async () => {
    await AsyncStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  },
  
  getToken: async () => {
    return await AsyncStorage.getItem('token');
  }
};

