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
    try {
      await AsyncStorage.multiRemove(['token', 'role', 'level']);
      return true; // Indicate successful logout
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  },
  
  getToken: async () => {
    return await AsyncStorage.getItem('token');
  }
};

