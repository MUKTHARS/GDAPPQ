import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import api from '../services/api';
import MemberCard from '../components/MemberCard';
import auth from '../services/auth'; 

export default function SurveyScreen({ navigation, route }) {
  const { sessionId } = route.params;
  const questions = [
    "Clarity of arguments",
    "Contribution to discussion",
    "Teamwork and collaboration",
    "Logical reasoning",
    "Communication skills"
  ];

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selections, setSelections] = useState(() => {
    const initialSelections = {};
    questions.forEach((_, index) => {
      initialSelections[index] = {};
    });
    return initialSelections;
  });
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        setLoading(true);
        const response = await api.student.getSessionParticipants(sessionId);
        
        const authData = await auth.getAuthData();
        const participants = response.data?.data || [];
        const filteredParticipants = participants.filter(
          participant => participant.id !== authData.userId
        );
        
        setMembers(filteredParticipants);
        setError(null);
        
        // Ensure selections exist for all questions
        setSelections(prev => {
          const newSelections = {...prev};
          questions.forEach((_, index) => {
            if (!newSelections[index]) {
              newSelections[index] = {};
            }
          });
          return newSelections;
        });
      } catch (err) {
        console.error('Failed to fetch participants:', err);
        setError('Failed to load participants');
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [sessionId]);

  // Rest of your component remains exactly the same
  const handleSelect = (memberId, rank) => {
    setSelections({
      ...selections,
      [currentQuestion]: {
        ...selections[currentQuestion],
        [rank]: memberId
      }
    });
  };

  const handleSubmit = async () => {
    try {
      await api.student.submitSurvey({
        sessionId,
        responses: selections
      });
      navigation.navigate('Results', { sessionId });
    } catch (error) {
      alert('Failed to submit survey');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.question}>
        Q{currentQuestion + 1}: {questions[currentQuestion]}
      </Text>
      
      <Text style={styles.instructions}>
        Select top 3 performers (you cannot select yourself)
      </Text>

      <FlatList
        data={members}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <MemberCard 
            member={item}
            onSelect={(rank) => handleSelect(item.id, rank)}
            selected={Object.values(selections[currentQuestion] || {}).includes(item.id)}
          />
        )}
      />

      <View style={styles.navigation}>
        {currentQuestion > 0 && (
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentQuestion(currentQuestion - 1)}
          >
            <Text>Previous</Text>
          </TouchableOpacity>
        )}
        
        {currentQuestion < questions.length - 1 ? (
          <TouchableOpacity
            style={[styles.navButton, styles.primaryButton]}
            onPress={() => setCurrentQuestion(currentQuestion + 1)}
          >
            <Text>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navButton, styles.primaryButton]}
            onPress={handleSubmit}
          >
            <Text>Submit Survey</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  question: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  instructions: {
    marginBottom: 20,
    color: '#666',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  navButton: {
    padding: 10,
    backgroundColor: '#ddd',
    borderRadius: 5,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
});



// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
// import api from '../services/api';
// import MemberCard from '../components/MemberCard';
// import auth from '../services/auth'; 
// export default function SurveyScreen({ navigation, route }) {
//   const { sessionId } = route.params;
//   const [currentQuestion, setCurrentQuestion] = useState(0);
//   const [selections, setSelections] = useState({});
//   const [members, setMembers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   const questions = [
//     "Clarity of arguments",
//     "Contribution to discussion",
//     "Teamwork and collaboration",
//     "Logical reasoning",
//     "Communication skills"
//   ];

//   useEffect(() => {
// const fetchParticipants = async () => {
//   try {
//     setLoading(true);
//     const response = await api.student.getSessionParticipants(sessionId);
    
//     // Handle various response formats
//     const responseData = response.data || {};
//     const participants = Array.isArray(responseData.data) ? 
//       responseData.data : 
//       Array.isArray(responseData) ? 
//         responseData : 
//         [];
    
//     // Filter out the current user
//     const authData = await auth.getAuthData();
//     const filteredParticipants = participants.filter(
//       participant => participant && participant.id !== authData.userId
//     );
    
//     setMembers(filteredParticipants);
//     setError(responseData.error || null);
//   } catch (err) {
//     console.error('Failed to fetch participants:', err);
//     setError('Failed to load participants');
//     setMembers([]);
//   } finally {
//     setLoading(false);
//   }
// };
    
//     // const fetchParticipants = async () => {
//     //   try {
//     //     setLoading(true);
//     //     const response = await api.student.getSessionParticipants(sessionId);
        
//     //     // Filter out the current user from the participants list
//     //     const authData = await auth.getAuthData();
//     //     const filteredParticipants = response.data.filter(
//     //       participant => participant.id !== authData.userId
//     //     );
        
//     //     setMembers(filteredParticipants);
//     //     setError(null);
//     //   } catch (err) {
//     //     console.error('Failed to fetch participants:', err);
//     //     setError('Failed to load participants');
//     //   } finally {
//     //     setLoading(false);
//     //   }
//     // };

//     fetchParticipants();
//   }, [sessionId]);

//   const handleSelect = (memberId, rank) => {
//     setSelections({
//       ...selections,
//       [currentQuestion]: {
//         ...selections[currentQuestion],
//         [rank]: memberId
//       }
//     });
//   };

//   const handleSubmit = async () => {
//     try {
//       await api.student.submitSurvey({
//         sessionId,
//         responses: selections
//       });
//       navigation.navigate('Results', { sessionId });
//     } catch (error) {
//       alert('Failed to submit survey');
//     }
//   };

//   if (loading) {
//     return (
//       <View style={styles.container}>
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   if (error) {
//     return (
//       <View style={styles.container}>
//         <Text style={styles.errorText}>{error}</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <Text style={styles.question}>
//         Q{currentQuestion + 1}: {questions[currentQuestion]}
//       </Text>
      
//       <Text style={styles.instructions}>
//         Select top 3 performers (you cannot select yourself)
//       </Text>

//       <FlatList
//         data={members}
//         keyExtractor={item => item.id}
//         renderItem={({ item }) => (
//           <MemberCard 
//             member={item}
//             onSelect={(rank) => handleSelect(item.id, rank)}
//             selected={Object.values(selections[currentQuestion] || {}).includes(item.id)}
//           />
//         )}
//       />

//       <View style={styles.navigation}>
//         {currentQuestion > 0 && (
//           <TouchableOpacity
//             style={styles.navButton}
//             onPress={() => setCurrentQuestion(currentQuestion - 1)}
//           >
//             <Text>Previous</Text>
//           </TouchableOpacity>
//         )}
        
//         {currentQuestion < questions.length - 1 ? (
//           <TouchableOpacity
//             style={[styles.navButton, styles.primaryButton]}
//             onPress={() => setCurrentQuestion(currentQuestion + 1)}
//           >
//             <Text>Next</Text>
//           </TouchableOpacity>
//         ) : (
//           <TouchableOpacity
//             style={[styles.navButton, styles.primaryButton]}
//             onPress={handleSubmit}
//           >
//             <Text>Submit Survey</Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//   },
//   question: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 10,
//   },
//   instructions: {
//     marginBottom: 20,
//     color: '#666',
//   },
//   navigation: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 20,
//   },
//   navButton: {
//     padding: 10,
//     backgroundColor: '#ddd',
//     borderRadius: 5,
//   },
//   primaryButton: {
//     backgroundColor: '#007AFF',
//   },
//   errorText: {
//     color: 'red',
//     textAlign: 'center',
//     marginTop: 20,
//   },
// });



// import React, { useState } from 'react';
// import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
// import api from '../services/api';
// import MemberCard from '../components/MemberCard';

// export default function SurveyScreen({ navigation, route }) {
//   const { sessionId } = route.params;
//   const [currentQuestion, setCurrentQuestion] = useState(0);
//   const [selections, setSelections] = useState({});
//   const [members, setMembers] = useState([
//     { id: '1', name: 'John Doe', department: 'CS' },
//     { id: '2', name: 'Jane Smith', department: 'ECE' },
//   ]);

//   const questions = [
//     "Clarity of arguments",
//     "Contribution to discussion",
//     "Teamwork and collaboration",
//     "Logical reasoning",
//     "Communication skills"
//   ];

//   const handleSelect = (memberId, rank) => {
//     setSelections({
//       ...selections,
//       [currentQuestion]: {
//         ...selections[currentQuestion],
//         [rank]: memberId
//       }
//     });
//   };

//   const handleSubmit = async () => {
//     try {
//       await api.student.submitSurvey({
//         sessionId,
//         responses: selections
//       });
//       navigation.navigate('Results', { sessionId });
//     } catch (error) {
//       alert('Failed to submit survey');
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.question}>
//         Q{currentQuestion + 1}: {questions[currentQuestion]}
//       </Text>
      
//       <Text style={styles.instructions}>
//         Select top 3 performers (you cannot select yourself)
//       </Text>

//       <FlatList
//         data={members}
//         keyExtractor={item => item.id}
//         renderItem={({ item }) => (
//           <MemberCard 
//             member={item}
//             onSelect={(rank) => handleSelect(item.id, rank)}
//             selected={Object.values(selections[currentQuestion] || {}).includes(item.id)}
//           />
//         )}
//       />

//       <View style={styles.navigation}>
//         {currentQuestion > 0 && (
//           <TouchableOpacity
//             style={styles.navButton}
//             onPress={() => setCurrentQuestion(currentQuestion - 1)}
//           >
//             <Text>Previous</Text>
//           </TouchableOpacity>
//         )}
        
//         {currentQuestion < questions.length - 1 ? (
//           <TouchableOpacity
//             style={[styles.navButton, styles.primaryButton]}
//             onPress={() => setCurrentQuestion(currentQuestion + 1)}
//           >
//             <Text>Next</Text>
//           </TouchableOpacity>
//         ) : (
//           <TouchableOpacity
//             style={[styles.navButton, styles.primaryButton]}
//             onPress={handleSubmit}
//           >
//             <Text>Submit Survey</Text>
//           </TouchableOpacity>
//         )}
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//   },
//   question: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     marginBottom: 10,
//   },
//   instructions: {
//     marginBottom: 20,
//     color: '#666',
//   },
//   navigation: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 20,
//   },
//   navButton: {
//     padding: 15,
//     backgroundColor: '#eee',
//     borderRadius: 5,
//   },
//   primaryButton: {
//     backgroundColor: '#2e86de',
//   },
// });