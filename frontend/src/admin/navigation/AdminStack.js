// src/admin/navigation/AdminStack.js
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import Dashboard from '../screens/Dashboard';
import VenueSetup from '../screens/VenueSetup';
import SessionConfig from '../screens/SessionConfig';
import QrScreen from '../screens/QrScreen';
import SessionRules from '../screens/SessionRules';
import AnalyticsDashboard from '../screens/AnalyticsDashboard';
import SessionCalendar from '../screens/SessionCalendar';
import StudentProgress from '../screens/StudentProgress';
import QuestionBank from '../screens/QuestionBank';
import BulkSessions from '../screens/BulkSessions';
import React from 'react';

const Stack = createStackNavigator();

const AdminStack = ({ initialRouteName = 'Login', onLoginSuccess }) => {
  // Create a wrapped LoginScreen component that calls onLoginSuccess
  const LoginScreenWrapper = (props) => (
    <LoginScreen 
      {...props} 
      onLoginSuccess={() => {
        if (onLoginSuccess) {
          onLoginSuccess();
        }
        props.navigation.navigate('Dashboard');
      }}
    />
  );

  return (
    <Stack.Navigator 
      initialRouteName={initialRouteName}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2e86de',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreenWrapper}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Dashboard" 
        component={Dashboard} 
        options={{ title: 'Admin Dashboard' }} 
      />
      <Stack.Screen 
        name="VenueSetup" 
        component={VenueSetup} 
        options={{ title: 'Venue Setup' }} 
      />
      <Stack.Screen 
        name="Bulk Session" 
        component={BulkSessions} 
        options={{ title: 'Bulk Session Setup' }} 
      />
      <Stack.Screen 
        name="SessionConfig" 
        component={SessionConfig} 
        options={{ title: 'Session Configuration' }} 
      />
      <Stack.Screen 
        name="QrScreen" 
        component={QrScreen} 
        options={{ title: 'Venue QR Code' }}
      />
      <Stack.Screen 
        name="SessionRules" 
        component={SessionRules} 
        options={{ title: 'Session Rules' }} 
      />
      <Stack.Screen 
        name="Analytics" 
        component={AnalyticsDashboard} 
        options={{ title: 'Analytics Dashboard' }} 
      />
      <Stack.Screen 
        name="SessionCalendar" 
        component={SessionCalendar} 
        options={{ title: 'Session Calendar' }} 
      />
      <Stack.Screen 
        name="StudentProgress" 
        component={StudentProgress} 
        options={{ title: 'Student Progress' }} 
      />
      <Stack.Screen 
        name="QuestionBank" 
        component={QuestionBank} 
        options={{ title: 'Question Bank' }} 
      />
    </Stack.Navigator>
  );
};

export default AdminStack;

// // AdminStack.js
// import { createStackNavigator } from '@react-navigation/stack';
// import LoginScreen from '../screens/LoginScreen';
// import Dashboard from '../screens/Dashboard';
// import VenueSetup from '../screens/VenueSetup';
// import SessionConfig from '../screens/SessionConfig';
// import QrScreen from '../screens/QrScreen';
// import SessionRules from '../screens/SessionRules';
// import AnalyticsDashboard from '../screens/AnalyticsDashboard';
// import SessionCalendar from '../screens/SessionCalendar';
// import StudentProgress from '../screens/StudentProgress';
// import QuestionBank from '../screens/QuestionBank';
// import BulkSessions from '../screens/BulkSessions';

// const Stack = createStackNavigator();

// export default function AdminStack() {
//   return (
//     <Stack.Navigator initialRouteName="Login">
//       <Stack.Screen 
//         name="Login" 
//         component={LoginScreen}
//         options={{ headerShown: false }}
//       />
//       <Stack.Screen name="Dashboard" component={Dashboard} />
//       <Stack.Screen name="VenueSetup" component={VenueSetup} />
//        <Stack.Screen name="Bulk Session" component={BulkSessions} />
//       <Stack.Screen name="SessionConfig" component={SessionConfig} />
//       <Stack.Screen name="QrScreen" component={QrScreen} options={{ title: 'Venue QR Code' }}
//       />
//       <Stack.Screen name="SessionRules" component={SessionRules} />
//       <Stack.Screen name="Analytics" component={AnalyticsDashboard} />
//       <Stack.Screen name="SessionCalendar" component={SessionCalendar} />
//       <Stack.Screen name="StudentProgress" component={StudentProgress} />
//       <Stack.Screen name="QuestionBank" component={QuestionBank} />
//     </Stack.Navigator>
//   );
// }
