// frontend/src/student/screens/SurveyScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../services/api';
import auth from '../services/auth';

const MemberCard = ({ member, onSelect, selections, currentRankings }) => {
  const getRankForMember = () => {
    for (const [rank, memberId] of Object.entries(currentRankings)) {
      if (memberId === member.id) {
        return parseInt(rank);
      }
    }
    return null;
  };

  const currentRank = getRankForMember();
  const isSelected = currentRank !== null;

  const getRankColor = (rank) => {
    switch(rank) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver  
      case 3: return '#CD7F32'; // Bronze
      default: return '#007AFF';
    }
  };

  const getRankLabel = (rank) => {
    switch(rank) {
      case 1: return '🥇 1st Place';
      case 2: return '🥈 2nd Place'; 
      case 3: return '🥉 3rd Place';
      default: return `Rank ${rank}`;
    }
  };

  return (
    <View style={[styles.memberCard, isSelected && { borderColor: getRankColor(currentRank), borderWidth: 2 }]}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.name}</Text>
        <Text style={styles.memberDetails}>{member.email}</Text>
      </View>
      
      {isSelected ? (
        <View style={styles.selectedRankContainer}>
          <View style={[styles.rankBadge, { backgroundColor: getRankColor(currentRank) }]}>
            <Text style={styles.rankBadgeText}>{getRankLabel(currentRank)}</Text>
          </View>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onSelect(currentRank, null)}
          >
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.rankingButtons}>
          {[1].map(rank => {
            const isRankTaken = Object.values(currentRankings).includes(member.id) || currentRankings[rank];
            return (
              <TouchableOpacity
                key={rank}
                style={[
                  styles.rankButton,
                  { backgroundColor: getRankColor(rank) },
                  isRankTaken && styles.disabledButton
                ]}
                onPress={() => !isRankTaken && onSelect(rank, member.id)}
                disabled={isRankTaken}
              >
                <Text style={[styles.rankButtonText, isRankTaken && styles.disabledText]}>
                  {rank === 1 && '🥇'}
                </Text>
                <Text style={[styles.rankButtonLabel, isRankTaken && styles.disabledText]}>
                  {rank === 1 ? '1st' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

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
  const [timeLeft, setTimeLeft] = useState(30);
  const [penaltyApplied, setPenaltyApplied] = useState(false);

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
        
        setMembers(filteredParticipants.slice(0, 1)); // Only take first participant for testing
        setError(null);
        
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

  useEffect(() => {
    if (timeLeft <= 0) {
      if (!penaltyApplied) {
        Alert.alert('Time Up', 'Penalty will be applied if you delay further');
        setPenaltyApplied(true);
      }
      return;
    }
    
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, penaltyApplied]);

  const handleSelect = (rank, memberId) => {
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
    const currentSelections = selections[currentQuestion];
    if (!currentSelections[1]) {
      Alert.alert('Incomplete', 'Please select 1st place');
      return;
    }

    // Get auth data
    const authData = await auth.getAuthData();
    
    // Format responses as the backend expects
    const formattedResponses = {};
    Object.entries(selections).forEach(([qIndex, ranks]) => {
      const questionNum = parseInt(qIndex) + 1;
      formattedResponses[questionNum] = {
        first_place: ranks[1] || '',
        second_place: ranks[2] || '',
        third_place: ranks[3] || '',
        weight: 1.0 // Default weight
      };
    });

    await api.student.submitSurvey({
      session_id: sessionId,
      responses: formattedResponses,
      tookTooLong: penaltyApplied,
      student_id: authData.userId // Pass student ID from auth
    });
    
    navigation.navigate('Results', { sessionId });
  } catch (error) {
    console.error('Failed to submit survey:', error);
    Alert.alert('Error', error.message || 'Failed to submit survey');
  }
};

  const handleNextQuestion = () => {
    setCurrentQuestion(prev => prev + 1);
    setTimeLeft(30);
    setPenaltyApplied(false);
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

  const currentRankings = selections[currentQuestion] || {};

  return (
    <View style={styles.container}>
      <Text style={styles.timer}>
        Time Left: {timeLeft}s {penaltyApplied && '(Penalty Applied)'}
      </Text>
      
      <Text style={styles.question}>
        Q{currentQuestion + 1}: {questions[currentQuestion]}
      </Text>
      
      <Text style={styles.instructions}>
        Select the top performer (testing with one user)
      </Text>

      <View style={styles.rankingSummary}>
        <Text style={styles.summaryTitle}>Current Ranking:</Text>
        <View style={styles.summaryContainer}>
          {[1].map(rank => {
            const selectedMember = members.find(m => m.id === currentRankings[rank]);
            return (
              <View key={rank} style={styles.summaryItem}>
                <Text style={styles.summaryRank}>
                  {rank === 1 ? '🥇 1st' : ''}
                </Text>
                <Text style={styles.summaryName}>
                  {selectedMember ? selectedMember.name : 'Not selected'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <FlatList
        data={members}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <MemberCard 
            member={item}
            onSelect={handleSelect}
            selections={selections}
            currentRankings={currentRankings}
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
            onPress={handleNextQuestion}
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
// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
// import api from '../services/api';
// import auth from '../services/auth';

// const MemberCard = ({ member, onSelect, selections, currentRankings }) => {
//   const getRankForMember = () => {
//     for (const [rank, memberId] of Object.entries(currentRankings)) {
//       if (memberId === member.id) {
//         return parseInt(rank);
//       }
//     }
//     return null;
//   };

//   const currentRank = getRankForMember();
//   const isSelected = currentRank !== null;

//   const getRankColor = (rank) => {
//     switch(rank) {
//       case 1: return '#FFD700'; // Gold
//       case 2: return '#C0C0C0'; // Silver  
//       case 3: return '#CD7F32'; // Bronze
//       default: return '#007AFF';
//     }
//   };

//   const getRankLabel = (rank) => {
//     switch(rank) {
//       case 1: return '🥇 1st Place';
//       case 2: return '🥈 2nd Place'; 
//       case 3: return '🥉 3rd Place';
//       default: return `Rank ${rank}`;
//     }
//   };

//   return (
//     <View style={[styles.memberCard, isSelected && { borderColor: getRankColor(currentRank), borderWidth: 2 }]}>
//       <View style={styles.memberInfo}>
//         <Text style={styles.memberName}>{member.name}</Text>
//         <Text style={styles.memberDetails}>{member.email}</Text>
//       </View>
      
//       {isSelected ? (
//         <View style={styles.selectedRankContainer}>
//           <View style={[styles.rankBadge, { backgroundColor: getRankColor(currentRank) }]}>
//             <Text style={styles.rankBadgeText}>{getRankLabel(currentRank)}</Text>
//           </View>
//           <TouchableOpacity
//             style={styles.removeButton}
//             onPress={() => onSelect(currentRank, null)}
//           >
//             <Text style={styles.removeButtonText}>Remove</Text>
//           </TouchableOpacity>
//         </View>
//       ) : (
//         <View style={styles.rankingButtons}>
//           {[1, 2, 3].map(rank => {
//             const isRankTaken = Object.values(currentRankings).includes(member.id) || currentRankings[rank];
//             return (
//               <TouchableOpacity
//                 key={rank}
//                 style={[
//                   styles.rankButton,
//                   { backgroundColor: getRankColor(rank) },
//                   isRankTaken && styles.disabledButton
//                 ]}
//                 onPress={() => !isRankTaken && onSelect(rank, member.id)}
//                 disabled={isRankTaken}
//               >
//                 <Text style={[styles.rankButtonText, isRankTaken && styles.disabledText]}>
//                   {rank === 1 && '🥇'}
//                   {rank === 2 && '🥈'}
//                   {rank === 3 && '🥉'}
//                 </Text>
//                 <Text style={[styles.rankButtonLabel, isRankTaken && styles.disabledText]}>
//                   {rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}
//                 </Text>
//               </TouchableOpacity>
//             );
//           })}
//         </View>
//       )}
//     </View>
//   );
// };

// export default function SurveyScreen({ navigation, route }) {
//   const { sessionId } = route.params;
//   const questions = [
//     "Clarity of arguments",
//     "Contribution to discussion",
//     "Teamwork and collaboration", 
//     "Logical reasoning",
//     "Communication skills"
//   ];

//   const [currentQuestion, setCurrentQuestion] = useState(0);
//   const [selections, setSelections] = useState(() => {
//     const initialSelections = {};
//     questions.forEach((_, index) => {
//       initialSelections[index] = {};
//     });
//     return initialSelections;
//   });
//   const [members, setMembers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [timeLeft, setTimeLeft] = useState(30);
//   const [penaltyApplied, setPenaltyApplied] = useState(false);

//   useEffect(() => {
//     const fetchParticipants = async () => {
//       try {
//         setLoading(true);
//         const response = await api.student.getSessionParticipants(sessionId);
        
//         const authData = await auth.getAuthData();
//         const participants = response.data?.data || [];
//         const filteredParticipants = participants.filter(
//           participant => participant.id !== authData.userId
//         );
        
//         setMembers(filteredParticipants);
//         setError(null);
        
//         setSelections(prev => {
//           const newSelections = {...prev};
//           questions.forEach((_, index) => {
//             if (!newSelections[index]) {
//               newSelections[index] = {};
//             }
//           });
//           return newSelections;
//         });
//       } catch (err) {
//         console.error('Failed to fetch participants:', err);
//         setError('Failed to load participants');
//         setMembers([]);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchParticipants();
//   }, [sessionId]);

//   useEffect(() => {
//     if (timeLeft <= 0) {
//       if (!penaltyApplied) {
//         Alert.alert('Time Up', 'Penalty will be applied if you delay further');
//         setPenaltyApplied(true);
//       }
//       return;
//     }
    
//     const timer = setInterval(() => {
//       setTimeLeft(prev => prev - 1);
//     }, 1000);
    
//     return () => clearInterval(timer);
//   }, [timeLeft, penaltyApplied]);

//   const handleSelect = (rank, memberId) => {
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
//       const currentSelections = selections[currentQuestion];
//       if (!currentSelections[1] || !currentSelections[2] || !currentSelections[3]) {
//         Alert.alert('Incomplete', 'Please rank all 3 positions');
//         return;
//       }

//       // Include penalty flag if time ran out
//       const responseData = {
//         sessionId,
//         responses: selections,
//         tookTooLong: penaltyApplied
//       };

//       await api.student.submitSurvey(responseData);
//       navigation.navigate('Results', { sessionId });
//     } catch (error) {
//       console.error('Failed to submit survey:', error);
//       Alert.alert('Error', 'Failed to submit survey');
//     }
//   };

//   const handleNextQuestion = () => {
//     setCurrentQuestion(prev => prev + 1);
//     setTimeLeft(30);
//     setPenaltyApplied(false);
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

//   const currentRankings = selections[currentQuestion] || {};

//   return (
//     <View style={styles.container}>
//       <Text style={styles.timer}>
//         Time Left: {timeLeft}s {penaltyApplied && '(Penalty Applied)'}
//       </Text>
      
//       <Text style={styles.question}>
//         Q{currentQuestion + 1}: {questions[currentQuestion]}
//       </Text>
      
//       <Text style={styles.instructions}>
//         Select top 3 performers (you cannot select yourself)
//       </Text>

//       <View style={styles.rankingSummary}>
//         <Text style={styles.summaryTitle}>Current Rankings:</Text>
//         <View style={styles.summaryContainer}>
//           {[1, 2, 3].map(rank => {
//             const selectedMember = members.find(m => m.id === currentRankings[rank]);
//             return (
//               <View key={rank} style={styles.summaryItem}>
//                 <Text style={styles.summaryRank}>
//                   {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'} {rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}:
//                 </Text>
//                 <Text style={styles.summaryName}>
//                   {selectedMember ? selectedMember.name : 'Not selected'}
//                 </Text>
//               </View>
//             );
//           })}
//         </View>
//       </View>

//       <FlatList
//         data={members}
//         keyExtractor={item => item.id}
//         renderItem={({ item }) => (
//           <MemberCard 
//             member={item}
//             onSelect={handleSelect}
//             selections={selections}
//             currentRankings={currentRankings}
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
//             onPress={handleNextQuestion}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  timer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5722',
    marginBottom: 10,
    textAlign: 'center',
  },
  question: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  rankingSummary: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  summaryTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
  },
  summaryRank: {
    fontWeight: 'bold',
  },
  summaryName: {
    color: '#333',
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  memberDetails: {
    color: '#666',
    fontSize: 14,
  },
  selectedRankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    padding: 5,
    borderRadius: 4,
    marginRight: 10,
  },
  rankBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  removeButton: {
    padding: 5,
  },
  removeButtonText: {
    color: '#FF5252',
  },
  rankingButtons: {
    flexDirection: 'row',
  },
  rankButton: {
    padding: 8,
    borderRadius: 4,
    marginLeft: 5,
    alignItems: 'center',
    minWidth: 50,
  },
  rankButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  rankButtonLabel: {
    color: '#fff',
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  navButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#e0e0e0',
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  errorText: {
    color: '#FF5252',
    textAlign: 'center',
    marginTop: 20,
  },
});