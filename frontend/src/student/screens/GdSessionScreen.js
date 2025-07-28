import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, BackHandler } from 'react-native';
import api from '../services/api';
import auth from '../services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Timer from '../components/Timer';
export default function GdSessionScreen({ navigation, route }) {
  const { sessionId } = route.params || {};
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState('prep');
  const [timerActive, setTimerActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
  const syncPhaseWithServer = async () => {
    try {
      const response = await api.student.getSessionPhase(sessionId);
      if (response.data.phase !== phase) {
        setPhase(response.data.phase);
        const remainingSeconds = Math.max(0, 
          (new Date(response.data.end_time) - new Date()) / 1000
        );
        setTimeRemaining(remainingSeconds);
      }
    } catch (error) {
      console.log("Using local phase state as fallback");
    }
  };
  
  syncPhaseWithServer();
}, [sessionId]);
  // Load session state from storage on mount
  useEffect(() => {
    const loadSessionState = async () => {
      try {
        const savedState = await AsyncStorage.getItem(`session_${sessionId}`);
        if (savedState) {
          const { phase: savedPhase, timeRemaining: savedTime } = JSON.parse(savedState);
          setPhase(savedPhase);
          setTimeRemaining(savedTime);
        }
      } catch (error) {
        console.log('Error loading session state:', error);
      }
    };

    if (sessionId) {
      loadSessionState();
    }
  }, [sessionId]);

  // Save session state to storage whenever it changes
  useEffect(() => {
    const saveSessionState = async () => {
      try {
        await AsyncStorage.setItem(`session_${sessionId}`, JSON.stringify({
          phase,
          timeRemaining
        }));
      } catch (error) {
        console.log('Error saving session state:', error);
      }
    };

    if (sessionId) {
      saveSessionState();
    }
  }, [phase, timeRemaining, sessionId]);

  // Handle back button press
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        "Session in Progress",
        "Are you sure you want to leave? The timer will continue running.",
        [
          {
            text: "Cancel",
            onPress: () => null,
            style: "cancel"
          },
          { 
            text: "Leave", 
            onPress: () => navigation.goBack() 
          }
        ]
      );
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  // Fetch session details
  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchSession = async () => {
      try {
        const authData = await auth.getAuthData();
        
        if (!authData?.token) {
          throw new Error('Authentication required');
        }

        const response = await api.student.getSession(sessionId);
        
        if (response.data?.error) {
          throw new Error(response.data.error);
        }

        if (!response.data || !response.data.id) {
          throw new Error('Invalid session data received');
        }

        setSession(response.data);
      } catch (error) {
        console.error('Failed to load session:', error);
        let errorMessage = error.message;
        
        if (error.response) {
          if (error.response.status === 404) {
            errorMessage = 'Session not found';
          } else if (error.response.status === 403) {
            errorMessage = 'Not authorized to view this session';
          } else if (error.response.status === 500) {
            errorMessage = 'Server error - please try again later';
          }
        }
        
        Alert.alert(
          'Session Error',
          errorMessage,
          [{ 
            text: 'OK', 
            onPress: () => navigation.goBack()
          }]
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, navigation]);

const handlePhaseComplete = () => {
  if (phase === 'prep') {
    setPhase('discussion');
    setTimeRemaining(session.discussion_time * 60); 
  } else if (phase === 'discussion') {
    setPhase('survey');
    setTimeRemaining(session.survey_time * 60);
  } else {
    navigation.navigate('Survey', { 
      sessionId: sessionId,
      members: [] 
    });
  }
};

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text>Loading session details...</Text>
      </View>
    );
  }

  if (!sessionId || !session) {
    return (
      <View style={styles.loading}>
        <Text>Failed to load session</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.phaseText}>
        {phase === 'prep' ? 'Preparation' : 'Discussion'} Phase
      </Text>
      
<Timer 
  duration={
    phase === 'prep' ? session.prep_time :
    phase === 'discussion' ? session.discussion_time :
    session.survey_time 
  }
  onComplete={handlePhaseComplete}
  active={timerActive}
  initialTimeRemaining={timeRemaining}
  onTick={(remaining) => setTimeRemaining(remaining)}
/>

      <Text style={styles.topic}>{session.topic}</Text>
    
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  topic: {
    fontSize: 20,
    textAlign: 'center',
    marginVertical: 30,
  },
  button: {
    padding: 15,
    backgroundColor: '#ddd',
    borderRadius: 5,
    marginTop: 20,
  },
  backButton: {
    color: 'blue',
    marginTop: 20,
  },
});

// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
// import api from '../services/api';
// import Timer from '../components/Timer';
// import auth from '../services/auth';


// export default function GdSessionScreen({ navigation, route }) {
//   const { sessionId } = route.params;
//   const [session, setSession] = useState(null);
//   const [phase, setPhase] = useState('prep');
//   const [timerActive, setTimerActive] = useState(true);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     console.log('GdSessionScreen mounted with sessionId:', sessionId);
    
//     const fetchSession = async () => {
//       try {
//         console.log('Fetching session details for:', sessionId);
//         const authData = await auth.getAuthData();
        
//         if (!authData?.token) {
//           throw new Error('Authentication required');
//         }

//         const response = await api.student.getSession(sessionId);
//         console.log('Session response:', response);
        
//         // Check for error in response data
//         if (response.data?.error) {
//           throw new Error(response.data.error);
//         }

//         // Validate required session data
//         if (!response.data || 
//             !response.data.id || 
//             typeof response.data.prep_time === 'undefined' || 
//             typeof response.data.discussion_time === 'undefined') {
//           throw new Error('Invalid session data received');
//         }

//         setSession(response.data);
//       } catch (error) {
//         console.error('Failed to load session:', error);
//         let errorMessage = error.message;
        
//         // Handle specific error cases
//         if (error.response) {
//           if (error.response.status === 404) {
//             errorMessage = 'Session not found';
//           } else if (error.response.status === 403) {
//             errorMessage = 'Not authorized to view this session';
//           } else if (error.response.status === 500) {
//             errorMessage = 'Server error - please try again later';
//           }
//         }
        
//         Alert.alert(
//           'Session Error',
//           errorMessage,
//           [{ 
//             text: 'OK', 
//             onPress: () => navigation.goBack()
//           }]
//         );
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchSession();
//   }, [sessionId, navigation]);

//   const handlePhaseComplete = () => {
//     if (phase === 'prep') {
//       setPhase('discussion');
//     } else if (phase === 'discussion') {
//       setPhase('survey');
//     } else {
//       navigation.navigate('Survey', { sessionId });
//     }
//   };

//   if (loading) {
//     return (
//       <View style={styles.loading}>
//         <Text>Loading session details...</Text>
//       </View>
//     );
//   }

//   if (!session) {
//     return (
//       <View style={styles.loading}>
//         <Text>Failed to load session</Text>
//         <TouchableOpacity onPress={() => navigation.goBack()}>
//           <Text style={styles.backButton}>Go Back</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <Text style={styles.phaseText}>
//         {phase === 'prep' ? 'Preparation' : 'Discussion'} Phase
//       </Text>
      
//       <Timer 
//         duration={phase === 'prep' ? session.prep_time : session.discussion_time}
//         onComplete={handlePhaseComplete}
//         active={timerActive}
//       />

//       <Text style={styles.topic}>{session.topic}</Text>
      
//       <TouchableOpacity
//         style={styles.button}
//         onPress={() => setTimerActive(!timerActive)}
//       >
//         <Text>{timerActive ? 'Pause' : 'Resume'}</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loading: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   phaseText: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 20,
//   },
//   topic: {
//     fontSize: 20,
//     textAlign: 'center',
//     marginVertical: 30,
//   },
//   button: {
//     padding: 15,
//     backgroundColor: '#ddd',
//     borderRadius: 5,
//     marginTop: 20,
//   },
//   backButton: {
//     color: 'blue',
//     marginTop: 20,
//   },
// });


// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
// import api from '../services/api';
// import Timer from '../components/Timer';

// export default function GdSessionScreen({ navigation, route }) {
//   const { sessionId } = route.params;
//   const [session, setSession] = useState(null);
//   const [phase, setPhase] = useState('prep');
//   const [timerActive, setTimerActive] = useState(true);

//   useEffect(() => {
//     const fetchSession = async () => {
//       try {
//         const response = await api.student.getSession(sessionId);
//         setSession(response.data);
//       } catch (error) {
//         alert('Failed to load session');
//         navigation.goBack();
//       }
//     };
//     fetchSession();
//   }, [sessionId]);

//   const handlePhaseComplete = () => {
//     if (phase === 'prep') {
//       setPhase('discussion');
//     } else if (phase === 'discussion') {
//       setPhase('survey');
//     } else {
//       navigation.navigate('Survey', { sessionId });
//     }
//   };

//   if (!session) return <View style={styles.loading}><Text>Loading...</Text></View>;

//   return (
//     <View style={styles.container}>
//       <Text style={styles.phaseText}>
//         {phase === 'prep' ? 'Preparation' : 'Discussion'} Phase
//       </Text>
      
//       <Timer 
//         duration={phase === 'prep' ? session.prep_time : session.discussion_time}
//         onComplete={handlePhaseComplete}
//         active={timerActive}
//       />

//       <Text style={styles.topic}>{session.topic}</Text>
      
//       <TouchableOpacity
//         style={styles.button}
//         onPress={() => setTimerActive(!timerActive)}
//       >
//         <Text>{timerActive ? 'Pause' : 'Resume'}</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loading: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   phaseText: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 20,
//   },
//   topic: {
//     fontSize: 20,
//     textAlign: 'center',
//     marginVertical: 30,
//   },
//   button: {
//     padding: 15,
//     backgroundColor: '#ddd',
//     borderRadius: 5,
//     marginTop: 20,
//   },
// });