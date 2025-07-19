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
        header: () => <HamburgerHeader title={getHeaderTitle(route)} />,
      })}
    >
      <Stack.Screen 
        name="SessionBooking" 
        component={SessionBooking}
      />
      <Stack.Screen 
        name="QrScanner" 
        component={QrScannerScreen}
      />
      <Stack.Screen 
        name="GdSession" 
        component={GdSessionScreen}
      />
      <Stack.Screen 
        name="Survey" 
        component={SurveyScreen}
      />
      <Stack.Screen 
        name="Results" 
        component={ResultsScreen}
      />
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

// import { createStackNavigator } from '@react-navigation/stack';
// import LoginScreen from '../screens/LoginScreen';
// import SessionBooking from '../screens/SessionBooking';
// import QrScannerScreen from '../screens/QrScannerScreen';
// import GdSessionScreen from '../screens/GdSessionScreen';
// import SurveyScreen from '../screens/SurveyScreen';
// import ResultsScreen from '../screens/ResultsScreen';

// const Stack = createStackNavigator();

// export default function StudentStack() {
//   return (
//     <Stack.Navigator initialRouteName="Login">
//       <Stack.Screen 
//         name="Login" 
//         component={LoginScreen}
//         options={{ headerShown: false }}
//       />
//       <Stack.Screen 
//         name="SessionBooking" 
//         component={SessionBooking}
//         options={{ title: 'Available Sessions' }}
//       />
//       <Stack.Screen 
//         name="QrScanner" 
//         component={QrScannerScreen}
//         options={{ title: 'Scan QR Code' }}
//       />
//       <Stack.Screen 
//         name="GdSession" 
//         component={GdSessionScreen}
//         options={{ headerShown: false }}
//       />
//       <Stack.Screen 
//         name="Survey" 
//         component={SurveyScreen}
//         options={{ title: 'GD Survey' }}
//       />
//       <Stack.Screen 
//         name="Results" 
//         component={ResultsScreen}
//         options={{ title: 'GD Results' }}
//       />
//     </Stack.Navigator>
//   );
// }

