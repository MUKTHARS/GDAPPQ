// AdminStack.js
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import Dashboard from '../screens/Dashboard';
import VenueSetup from '../screens/VenueSetup';
import SessionConfig from '../screens/SessionConfig';
import QrScreen from '../screens/QrScreen';
const Stack = createStackNavigator();

export default function AdminStack() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Dashboard" component={Dashboard} />
      <Stack.Screen name="VenueSetup" component={VenueSetup} />
      <Stack.Screen name="SessionConfig" component={SessionConfig} />
      <Stack.Screen name="QrScreen" component={QrScreen} options={{ title: 'Venue QR Code' }}
      />
    </Stack.Navigator>
  );
}
