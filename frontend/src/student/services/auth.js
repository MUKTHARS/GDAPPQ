import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default {
    login: async (email, password) => {
  try {
    const response = await api.post('/student/login', { 
      email: email.trim().toLowerCase(), 
      password 
    });
    
    if (!response.data?.token) {
      throw new Error('Authentication failed - no token received');
    }

    // Ensure token is stored as a clean string
    const cleanToken = response.data.token.replace(/^"(.*)"$/, '$1');
    await AsyncStorage.multiSet([
      ['token', cleanToken],
      ['role', 'student'],
      ['level', String(response.data.level || 1)]
    ]);
    
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error.response?.data?.error || 
                       error.message || 
                       'Invalid credentials';
    throw new Error(errorMessage);
  }
},

  // login: async (email, password) => {
  //   try {
  //     const response = await api.post('/student/login', { 
  //       email: email.trim().toLowerCase(), 
  //       password 
  //     });
      
  //     if (!response.data?.token) {
  //       throw new Error('Authentication failed - no token received');
  //     }

  //     await AsyncStorage.multiSet([
  //       ['token', response.data.token],
  //       ['role', 'student'],
  //       ['level', String(response.data.level || 1)]
  //     ]);
      
  //     return response.data;
  //   } catch (error) {
  //     console.error('Login error:', error);
  //     // Extract the error message more reliably
  //     const errorMessage = error.response?.data?.error || 
  //                        error.message || 
  //                        'Invalid credentials';
  //     throw new Error(errorMessage);
  //   }
  // },
  
   logout: async () => {
    await AsyncStorage.multiRemove(['token', 'role', 'level']);
  },
  
  getAuthData: async () => {
    const [token, role, level] = await AsyncStorage.multiGet(['token', 'role', 'level']);
    return {
      token: token[1],
      role: role[1],
      level: level[1]
    };
  }
};


// import api from './api';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// export default {
//   login: async (email, password) => {
//     console.log('Auth service login called');
//     try {
//       console.log('Making API call to /student/login');
//       const response = await api.post('/student/login', { 
//         email, 
//         password 
//       });
      
//       if (!response.data.token) {
//         console.error('No token in response');
//         throw new Error('No token received');
//       }

//       console.log('Login successful, storing tokens');
//       await AsyncStorage.multiSet([
//         ['token', response.data.token],
//         ['role', 'student'],
//         ['level', response.data.level.toString()]
//       ]);
      
//       return response.data;
//     } catch (error) {
//       console.error('Auth service error:', {
//         message: error.message,
//         response: error.response?.data
//       });
//       throw new Error(error.response?.data?.error || 'Login failed');
//     }
//   },
  
//   logout: async () => {
//     console.log('Logging out');
//     await AsyncStorage.multiRemove(['token', 'role', 'level']);
//   },
  
//   getAuthData: async () => {
//     console.log('Getting auth data');
//     const [token, role, level] = await AsyncStorage.multiGet(['token', 'role', 'level']);
//     return {
//       token: token[1],
//       role: role[1],
//       level: level[1]
//     };
//   }
// };

// import api from './api';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// export default {
//   login: async (email, password) => {
//     try {
//       const response = await api.student.login(email, password);
//       await AsyncStorage.multiSet([
//         ['token', response.data.token],
//         ['role', 'student'],
//         ['level', response.data.level.toString()]
//       ]);
//       return response.data;
//     } catch (error) {
//       throw new Error(error.response?.data?.error || 'Login failed');
//     }
//   },
  
//   logout: async () => {
//     await AsyncStorage.multiRemove(['token', 'role', 'level']);
//   },
  
//   getAuthData: async () => {
//     const [token, role, level] = await AsyncStorage.multiGet(['token', 'role', 'level']);
//     return {
//       token: token[1],
//       role: role[1],
//       level: level[1]
//     };
//   }
// };

// import api from './api';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// export default {
//   login: async (email, password) => {
//     const response = await api.student.login(email, password);
//     await AsyncStorage.setItem('token', response.data.token);
//     await AsyncStorage.setItem('level', response.data.level.toString());
//     return response.data;
//   },
//   logout: async () => {
//     await AsyncStorage.multiRemove(['token', 'level']);
//   }
// };