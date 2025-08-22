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
  const [topic, setTopic] = useState(""); // Separate state for topic

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

  // Fetch session details and topic
  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchSessionAndTopic = async () => {
      try {
        const authData = await auth.getAuthData();
        
        if (!authData?.token) {
          throw new Error('Authentication required');
        }

        // Fetch session details
        const response = await api.student.getSession(sessionId);
        
        if (response.data?.error) {
          throw new Error(response.data.error);
        }

        if (!response.data || !response.data.id) {
          throw new Error('Invalid session data received');
        }

        const sessionData = response.data;
        setSession(sessionData);

        // Fetch topic for the session's level - FIXED THIS PART
        try {
          const topicResponse = await api.student.getTopicForLevel(sessionData.level);
          
          // Check if the response structure is correct
          if (topicResponse.data && topicResponse.data.topic_text) {
            setTopic(topicResponse.data.topic_text);
          } else if (topicResponse.data && typeof topicResponse.data === 'string') {
            // Handle case where the response might be just the topic text
            setTopic(topicResponse.data);
          } else {
            // Use default topic if none found
            setTopic("Discuss the impact of technology on modern education");
          }
        } catch (topicError) {
          console.log('Failed to fetch session topic:', topicError);
          setTopic("Discuss the impact of technology on modern education");
        }

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

    fetchSessionAndTopic();
  }, [sessionId, navigation]);

  const handlePhaseComplete = () => {
    if (phase === 'prep') {
      setPhase('discussion');
      setTimeRemaining(session.discussion_time * 5); 
    } else if (phase === 'discussion') {
      setPhase('survey');
      setTimeRemaining(session.survey_time * 5);
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
      {/* Topic Display Area - Moved to top and made more prominent */}
      <View style={styles.topicContainer}>
        <Text style={styles.topicLabel}>Group Discussion Topic:</Text>
        <Text style={styles.topic}>{topic}</Text>
      </View>
   
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
  topicContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  topicLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#495057',
    textAlign: 'center',
  },
  topic: {
    fontSize: 18,
    textAlign: 'center',
    color: '#212529',
    lineHeight: 24,
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
// import { View, Text, StyleSheet, TouchableOpacity, Alert, BackHandler } from 'react-native';
// import api from '../services/api';
// import auth from '../services/auth';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import Timer from '../components/Timer';
// export default function GdSessionScreen({ navigation, route }) {
//   const { sessionId } = route.params || {};
//   const [session, setSession] = useState(null);
//   const [phase, setPhase] = useState('prep');
//   const [timerActive, setTimerActive] = useState(true);
//   const [loading, setLoading] = useState(true);
//   const [timeRemaining, setTimeRemaining] = useState(0);

//   useEffect(() => {
//   const syncPhaseWithServer = async () => {
//     try {
//       const response = await api.student.getSessionPhase(sessionId);
//       if (response.data.phase !== phase) {
//         setPhase(response.data.phase);
//         const remainingSeconds = Math.max(0, 
//           (new Date(response.data.end_time) - new Date()) / 1000
//         );
//         setTimeRemaining(remainingSeconds);
//       }
//     } catch (error) {
//       console.log("Using local phase state as fallback");
//     }
//   };
  
//   syncPhaseWithServer();
// }, [sessionId]);
//   // Load session state from storage on mount
//   useEffect(() => {
//     const loadSessionState = async () => {
//       try {
//         const savedState = await AsyncStorage.getItem(`session_${sessionId}`);
//         if (savedState) {
//           const { phase: savedPhase, timeRemaining: savedTime } = JSON.parse(savedState);
//           setPhase(savedPhase);
//           setTimeRemaining(savedTime);
//         }
//       } catch (error) {
//         console.log('Error loading session state:', error);
//       }
//     };

//     if (sessionId) {
//       loadSessionState();
//     }
//   }, [sessionId]);

//   // Save session state to storage whenever it changes
//   useEffect(() => {
//     const saveSessionState = async () => {
//       try {
//         await AsyncStorage.setItem(`session_${sessionId}`, JSON.stringify({
//           phase,
//           timeRemaining
//         }));
//       } catch (error) {
//         console.log('Error saving session state:', error);
//       }
//     };

//     if (sessionId) {
//       saveSessionState();
//     }
//   }, [phase, timeRemaining, sessionId]);

//   // Handle back button press
//   useEffect(() => {
//     const backAction = () => {
//       Alert.alert(
//         "Session in Progress",
//         "Are you sure you want to leave? The timer will continue running.",
//         [
//           {
//             text: "Cancel",
//             onPress: () => null,
//             style: "cancel"
//           },
//           { 
//             text: "Leave", 
//             onPress: () => navigation.goBack() 
//           }
//         ]
//       );
//       return true;
//     };

//     const backHandler = BackHandler.addEventListener(
//       "hardwareBackPress",
//       backAction
//     );

//     return () => backHandler.remove();
//   }, [navigation]);

//   // Fetch session details
//   useEffect(() => {
//     if (!sessionId) {
//       setLoading(false);
//       return;
//     }

//    const fetchSession = async () => {
//   try {
//     const authData = await auth.getAuthData();
    
//     if (!authData?.token) {
//       throw new Error('Authentication required');
//     }

//     const response = await api.student.getSession(sessionId);
    
//     if (response.data?.error) {
//       throw new Error(response.data.error);
//     }

//     if (!response.data || !response.data.id) {
//       throw new Error('Invalid session data received');
//     }

//     // Set the initial session data
//     const sessionData = response.data;
    
//     // Fetch the topic for this session's level
//     try {
//       const topicResponse = await api.student.getSessionTopic(sessionData.level);
      
//       // Check if we have valid topic data in the response
//       if (topicResponse.data) {
//         // Handle both response formats:
//         // 1. Direct topic object with topic_text property
//         // 2. Object with data property containing the topic
//         const topicData = topicResponse.data.topic_text ? topicResponse.data : 
//                          (topicResponse.data.data ? topicResponse.data.data : null);
        
//         if (topicData && topicData.topic_text) {
//           sessionData.topic = topicData.topic_text;
//         } else {
//           // Use default topic if no valid topic found
//           sessionData.topic = "Discuss the impact of technology on modern education";
//         }
//       } else {
//         sessionData.topic = "Discuss the impact of technology on modern education";
//       }
//     } catch (topicError) {
//       console.log('Failed to fetch session topic:', topicError);
//       sessionData.topic = "Discuss the impact of technology on modern education";
//     }

//     setSession(sessionData);
//   } catch (error) {
//     console.error('Failed to load session:', error);
//     let errorMessage = error.message;
    
//     if (error.response) {
//       if (error.response.status === 404) {
//         errorMessage = 'Session not found';
//       } else if (error.response.status === 403) {
//         errorMessage = 'Not authorized to view this session';
//       } else if (error.response.status === 500) {
//         errorMessage = 'Server error - please try again later';
//       }
//     }
    
//     Alert.alert(
//       'Session Error',
//       errorMessage,
//       [{ 
//         text: 'OK', 
//         onPress: () => navigation.goBack()
//       }]
//     );
//   } finally {
//     setLoading(false);
//   }
// };

//     fetchSession();
//   }, [sessionId, navigation]);
// //   useEffect(() => {
// //   if (session?.level) {
// //     fetchSessionTopic(session.level);
// //   }
// // }, [session?.level]);
// // const fetchSessionTopic = async (sessionLevel) => {
// //   try {
// //     const response = await api.student.getSessionTopic(sessionLevel);
// //     if (response.data && response.data.topic_text) {
// //       setSession(prevSession => ({
// //         ...prevSession,
// //         topic: response.data.topic_text
// //       }));
// //     }
// //   } catch (error) {
// //     console.log('Failed to fetch session topic:', error);
// //     // Use a default topic if fetching fails
// //     setSession(prevSession => ({
// //       ...prevSession,
// //       topic: "Discuss the impact of technology on modern education"
// //     }));
// //   }
// // };
// const handlePhaseComplete = () => {
//   if (phase === 'prep') {
//     setPhase('discussion');
//     setTimeRemaining(session.discussion_time * 5); 
//   } else if (phase === 'discussion') {
//     setPhase('survey');
//     setTimeRemaining(session.survey_time * 5);
//   } else {
//     navigation.navigate('Survey', { 
//       sessionId: sessionId,
//       members: [] 
//     });
//   }
// };

//   if (loading) {
//     return (
//       <View style={styles.loading}>
//         <Text>Loading session details...</Text>
//       </View>
//     );
//   }

//   if (!sessionId || !session) {
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
      
// <Timer 
//   duration={
//     phase === 'prep' ? session.prep_time :
//     phase === 'discussion' ? session.discussion_time :
//     session.survey_time 
//   }
//   onComplete={handlePhaseComplete}
//   active={timerActive}
//   initialTimeRemaining={timeRemaining}
//   onTick={(remaining) => setTimeRemaining(remaining)}
// />

//       <Text style={styles.topic}>{session.topic}</Text>
    
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

