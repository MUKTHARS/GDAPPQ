import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdminStack from './admin/navigation/AdminStack';
import StudentStack from './student/navigation/StudentStack';

export default function App() {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const role = await AsyncStorage.getItem('role');
          setUserRole(role);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {userRole === 'admin' ? <AdminStack /> : <StudentStack />}
    </NavigationContainer>
  );
}

// import React from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import AdminStack from './admin/navigation/AdminStack';
// /////////
// export default function App() {
//   return (
//     <NavigationContainer>
//       <AdminStack />
//     </NavigationContainer>
//   );
// }