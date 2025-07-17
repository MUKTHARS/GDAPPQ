import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AdminStack from './admin/navigation/AdminStack';
/////////
export default function App() {
  return (
    <NavigationContainer>
      <AdminStack />
    </NavigationContainer>
  );
}