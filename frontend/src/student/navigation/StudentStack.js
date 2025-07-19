// src/student/navigation/StudentStack.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HamburgerHeader from '../components/HamburgerHeader';

// Import all your screens
import LoginScreen from '../screens/LoginScreen';
import SessionBooking from '../screens/SessionBooking';
import GdSessionScreen from '../screens/GdSessionScreen';
import QrScannerScreen from '../screens/QrScannerScreen';
import ResultsScreen from '../screens/ResultsScreen';
import SurveyScreen from '../screens/SurveyScreen';

const Stack = createStackNavigator();

const StudentStack = () => {
  return (
    <Stack.Navigator
      screenOptions={({ route }) => ({
        header: ({ navigation }) => {
          // Don't show header for Login screen
          if (route.name === 'Login') {
            return null;
          }
          return <HamburgerHeader title={getHeaderTitle(route)} navigation={navigation} />;
        },
      })}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SessionBooking" component={SessionBooking} />
      <Stack.Screen name="QrScanner" component={QrScannerScreen} />
      <Stack.Screen name="GdSession" component={GdSessionScreen} />
      <Stack.Screen name="Survey" component={SurveyScreen} />
      <Stack.Screen name="Results" component={ResultsScreen} />
    </Stack.Navigator>
  );
};

// Helper function to determine header title
const getHeaderTitle = (route) => {
  const routeName = route.name;
  
  switch (routeName) {
    case 'SessionBooking':
      return 'Available Sessions';
    case 'QrScanner':
      return 'Join Session';
    case 'GdSession':
      return 'GD Session';
    case 'Survey':
      return 'Survey';
    case 'Results':
      return 'Results';
    default:
      return '';
  }
};

export default StudentStack;