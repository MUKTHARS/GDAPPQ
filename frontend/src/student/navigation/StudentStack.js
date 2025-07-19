import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import SessionBooking from '../screens/SessionBooking';
import QrScannerScreen from '../screens/QrScannerScreen';
import GdSessionScreen from '../screens/GdSessionScreen';
import SurveyScreen from '../screens/SurveyScreen';
import ResultsScreen from '../screens/ResultsScreen';

const Stack = createStackNavigator();

export default function StudentStack() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="SessionBooking" 
        component={SessionBooking}
        options={{ title: 'Available Sessions' }}
      />
      <Stack.Screen 
        name="QrScanner" 
        component={QrScannerScreen}
        options={{ title: 'Scan QR Code' }}
      />
      <Stack.Screen 
        name="GdSession" 
        component={GdSessionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Survey" 
        component={SurveyScreen}
        options={{ title: 'GD Survey' }}
      />
      <Stack.Screen 
        name="Results" 
        component={ResultsScreen}
        options={{ title: 'GD Results' }}
      />
    </Stack.Navigator>
  );
}


// import { createStackNavigator } from '@react-navigation/stack';
// import LoginScreen from '../screens/LoginScreen';
// import SessionBooking from '../screens/SessionBooking';

// const Stack = createStackNavigator();

// export default function StudentStack() {
//   return (
//     <Stack.Navigator>
//       <Stack.Screen name="Login" component={LoginScreen} />
//       <Stack.Screen name="SessionBooking" component={SessionBooking} />
//     </Stack.Navigator>
//   );
// }