import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
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
            onPress={() => onSelect(currentRank, null)} // Remove selection
          >
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.rankingButtons}>
          {[1, 2, 3].map(rank => {
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
                disabled={!!isRankTaken}  // Fixed: Ensure boolean value
              >
                <Text style={[styles.rankButtonText, isRankTaken && styles.disabledText]}>
                  {rank === 1 && '🥇'}
                  {rank === 2 && '🥈'}
                  {rank === 3 && '🥉'}
                </Text>
                <Text style={[styles.rankButtonLabel, isRankTaken && styles.disabledText]}>
                  {rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const seededShuffle = (array, seed) => {
  const shuffled = [...array];
  let currentSeed = seed;
  const random = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};


// const shuffleArray = (array) => {
//   const shuffled = [...array];
//   for (let i = shuffled.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1));
//     [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
//   }
//   return shuffled;
// };

export default function SurveyScreen({ navigation, route }) {
  const { sessionId } = route.params;
  const [allQuestions, setAllQuestions] = useState([]); // Add this state
  const [shuffledQuestions, setShuffledQuestions] = useState([]); // Add this state
  const [questions, setQuestions] = useState([]); // Keep this for compatibility
  
  const [confirmedQuestions, setConfirmedQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selections, setSelections] = useState({});
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [penalties, setPenalties] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
   const [userSeed, setUserSeed] = useState(null);

 useEffect(() => {
    const initializeUserSeed = async () => {
      try {
        const authData = await auth.getAuthData();
        // Create a unique seed using user ID + session ID
        const seed = `${authData.userId}-${sessionId}`;
        setUserSeed(seed);
      } catch (error) {
        // Fallback to random seed if auth fails
        setUserSeed(Math.random().toString());
      }
    };
    initializeUserSeed();
  }, [sessionId]);


useEffect(() => {
  
 const fetchQuestions = async () => {
  if (!userSeed) return;

  try {
    const authData = await auth.getAuthData();
    
    // Get the student's level from auth data (stored during login)
    const studentLevel = parseInt(authData.level) || 1;
    console.log('Student level from auth:', studentLevel);
    
    // Use the student-specific endpoint with proper parameters
    const questionsResponse = await api.get('/student/questions', {
      params: { 
        level: studentLevel, // Use the student's actual level
        session_id: sessionId,
      }
    });
    
    console.log('Questions API response status:', questionsResponse.status);
    console.log('Questions API response data:', questionsResponse.data);
    
    // Handle different response formats
    let questionsData = questionsResponse.data;
    
    // If response is an object with data property, extract it
    if (questionsData && typeof questionsData === 'object' && !Array.isArray(questionsData)) {
      if (questionsData.data && Array.isArray(questionsData.data)) {
        questionsData = questionsData.data;
      } else if (Array.isArray(questionsData)) {
        // Already an array
      } else {
        // Try to extract any array from the object
        const arrayKeys = Object.keys(questionsData).filter(key => Array.isArray(questionsData[key]));
        if (arrayKeys.length > 0) {
          questionsData = questionsData[arrayKeys[0]];
        } else {
          questionsData = [];
        }
      }
    }
    
    if (!Array.isArray(questionsData)) {
      console.log('Questions data is not array, using empty array');
      questionsData = [];
    }
    
    console.log('Processed questions data:', questionsData);
    
    // Set default questions if empty
    if (questionsData.length === 0) {
      console.log('No questions returned from database, using fallback');
      questionsData = [
        { id: 'q1', text: 'Clarity of arguments', weight: 1.0 },
        { id: 'q2', text: 'Contribution to discussion', weight: 1.0 },
        { id: 'q3', text: 'Teamwork and collaboration', weight: 1.0 }
      ];
    } else {
      console.log(`Found ${questionsData.length} questions from database`);
    }
    
    setAllQuestions(questionsData);
    
    // Convert userSeed to a consistent numeric value
    let numericSeed = 0;
    for (let i = 0; i < userSeed.length; i++) {
      numericSeed = (numericSeed * 31 + userSeed.charCodeAt(i)) % 1000000;
    }
    
    // Shuffle the questions using the user-specific seed
    const shuffled = seededShuffle(questionsData, numericSeed);
    setShuffledQuestions(shuffled);
    setQuestions(shuffled);
    
    // Initialize selections for shuffled questions
    const initialSelections = {};
    shuffled.forEach((_, index) => {
      initialSelections[index] = {};
    });
    setSelections(initialSelections);
    
  } catch (error) {
    console.error('Questions fetch error:', error.response?.data || error.message);
    // Set default questions if there's an error
    const defaultQuestions = [
      { id: 'q1', text: 'Clarity of arguments', weight: 1.0 },
      { id: 'q2', text: 'Contribution to discussion', weight: 1.0 },
      { id: 'q3', text: 'Teamwork and collaboration', weight: 1.0 }
    ];
    
    setAllQuestions(defaultQuestions);
    
    // Use userSeed for shuffling even with default questions
    if (userSeed) {
      let numericSeed = 0;
      for (let i = 0; i < userSeed.length; i++) {
        numericSeed = (numericSeed * 31 + userSeed.charCodeAt(i)) % 1000000;
      }
      const shuffled = seededShuffle(defaultQuestions, numericSeed);
      setShuffledQuestions(shuffled);
      setQuestions(shuffled);
      
      const initialSelections = {};
      shuffled.forEach((_, index) => {
        initialSelections[index] = {};
      });
      setSelections(initialSelections);
    }
  }
};

  fetchQuestions();
}, [sessionId, userSeed]);


  // Timer management
  useEffect(() => {
    let timerInterval;
    let timeoutCheckInterval;
    
    const startTimer = async () => {
        try {
            setIsTimedOut(false);
            setTimeRemaining(30);
            
            // Start server-side timer
            await api.student.startQuestionTimer(sessionId, currentQuestion + 1);
            
            // Start local countdown
            timerInterval = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timerInterval);
                        setIsTimedOut(true);
                        handleTimeout();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            
            // Check server-side timeout status
            timeoutCheckInterval = setInterval(async () => {
                try {
                    const response = await api.student.checkQuestionTimeout(
                        sessionId, 
                        currentQuestion + 1
                    );
                    
                    if (response.data?.is_timed_out && !penalties[currentQuestion]) {
                        handleTimeout();
                    }
                } catch (err) {
                    console.log('Timeout check error:', err);
                }
            }, 5000);
            
        } catch (err) {
            console.log('Timer setup error:', err);
            // Fallback to client-side timer
            timerInterval = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timerInterval);
                        setIsTimedOut(true);
                        handleTimeout();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
    };
    
    const handleTimeout = async () => {
        if (!penalties[currentQuestion]) {
            try {
                const authData = await auth.getAuthData();
                await api.student.applyQuestionPenalty(
                    sessionId,
                    currentQuestion + 1,
                    authData.userId
                );
                setPenalties(prev => ({
                    ...prev,
                    [currentQuestion]: true
                }));
                Alert.alert(
                    "Time's Up!", 
                    "You've been penalized 0.5 points for not completing this question in time"
                );
            } catch (err) {
                console.log('Penalty application error:', err);
            }
        }
    };
    
    startTimer();
    
    return () => {
        clearInterval(timerInterval);
        clearInterval(timeoutCheckInterval);
    };
  }, [currentQuestion]);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        setLoading(true);
        const response = await api.student.getSessionParticipants(sessionId);
        
        // Handle both response formats:
        // 1. Direct array of participants (response.data)
        // 2. Object with data property (response.data.data)
        let participants = [];
        if (Array.isArray(response.data)) {
          participants = response.data;
        } else if (response.data?.data) {
          participants = response.data.data;
        }
        
        const authData = await auth.getAuthData();
        const filteredParticipants = participants.filter(
          participant => participant.id !== authData.userId
        );
        
        setMembers(filteredParticipants);
        setError(null);
        
        setSelections(prev => {
          const newSelections = {...prev};
          shuffledQuestions.forEach((_, index) => {
            if (!newSelections[index]) {
              newSelections[index] = {};
            }
          });
          return newSelections;
        });
      } catch (err) {
        setError('Failed to load participants');
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    if (shuffledQuestions.length > 0) {
      fetchParticipants();
    }
  }, [sessionId, shuffledQuestions]);

  const handleSelect = (rank, memberId) => {
    setSelections(prev => ({
      ...prev,
      [currentQuestion]: {
        ...prev[currentQuestion],
        [rank]: memberId
      }
    }));
  };

const confirmCurrentQuestion = async () => {
    const currentSelections = selections[currentQuestion] || {};
    const hasAtLeastOneRank = Object.keys(currentSelections).length > 0;
    
    if (!hasAtLeastOneRank && !penalties[currentQuestion]) {
        Alert.alert(
            "Incomplete Ranking",
            "You haven't selected any rankings for this question. " +
            "You'll receive a penalty if you proceed without selections.",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Proceed Anyway",
                    onPress: async () => {
                        try {
                            const authData = await auth.getAuthData();
                            await api.student.applyQuestionPenalty(
                                sessionId,
                                currentQuestion + 1,
                                authData.userId
                            );
                            setPenalties(prev => ({
                                ...prev,
                                [currentQuestion]: true
                            }));
                            proceedToNextQuestion(true); // Pass true for partial submission
                        } catch (err) {
                            console.log('Penalty application error:', err);
                        }
                    }
                }
            ]
        );
        return;
    }

    proceedToNextQuestion(true); // Pass true for partial submission
};

const proceedToNextQuestion = async (isPartial = false) => {
    setIsSubmitting(true);
    
    try {
        const currentSelections = selections[currentQuestion] || {};
        if (Object.keys(currentSelections).length > 0) {
            // Get the actual question from the shuffled array
            const shuffledQuestion = shuffledQuestions[currentQuestion];
            
            // Use question NUMBER (index + 1) instead of question ID as the key
            // The backend expects question numbers (1, 2, 3) not question IDs
            const questionNumber = currentQuestion + 1;
            
            const responseData = {
                sessionId,
                responses: {
                    [questionNumber]: currentSelections // Use question NUMBER as key
                },
                isPartial: isPartial // Indicate if this is a partial submission
            };
            
            console.log('Submitting survey data:', JSON.stringify(responseData, null, 2));
            await api.student.submitSurvey(responseData);
        }

        setConfirmedQuestions(prev => [...prev, currentQuestion]);
        
        if (currentQuestion === shuffledQuestions.length - 1) {
            // Final submission - mark as completed
            await api.student.markSurveyCompleted(sessionId);
            navigation.replace('Waiting', { sessionId });
        } else {
            setCurrentQuestion(prev => prev + 1);
        }
    } catch (error) {
        console.error('Error submitting survey:', error);
        Alert.alert('Error', 'Failed to submit survey. Please try again.');
    } finally {
        setIsSubmitting(false);
    }
};


  //   const proceedToNextQuestion = async () => {
  //   setIsSubmitting(true);
    
  //   try {
  //     // Only submit if there are selections
  //     const currentSelections = selections[currentQuestion] || {};
  //     if (Object.keys(currentSelections).length > 0) {
  //       // Get the original question from the shuffled array
  //       const shuffledQuestion = shuffledQuestions[currentQuestion];
        
  //       // Find the original index in allQuestions
  //       const originalQuestionIndex = allQuestions.findIndex(q => q.id === shuffledQuestion.id);
        
  //       const responseData = {
  //         sessionId,
  //         responses: {
  //           [originalQuestionIndex + 1]: currentSelections // Use original question number
  //         }
  //       };
  //       await api.student.submitSurvey(responseData);
  //     }

  //     setConfirmedQuestions(prev => [...prev, currentQuestion]);
      
  //     if (currentQuestion === shuffledQuestions.length - 1) {
  //       await api.student.markSurveyCompleted(sessionId);
  //       navigation.replace('Waiting', { sessionId });
  //     } else {
  //       setCurrentQuestion(prev => prev + 1);
  //     }
  //   } catch (error) {
  //     console.error('Error submitting survey:', error);
  //     Alert.alert('Error', 'Failed to submit survey. Please try again.');
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

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
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>
          Time remaining: {timeRemaining}s
        </Text>
        {isTimedOut && (
          <Text style={styles.timeoutWarning}>
            Time's up! Please submit your rankings
          </Text>
        )}
        {penalties[currentQuestion] && (
          <Text style={styles.penaltyWarning}>
            ⚠️ Time penalty applied for this question
          </Text>
        )}
      </View>
      
      <Text style={styles.question}>
        Q{currentQuestion + 1}: {shuffledQuestions[currentQuestion]?.text || 'Question loading...'}
      </Text>
      
      <Text style={styles.instructions}>
        Select top 3 performers (you cannot select yourself)
      </Text>

      <View style={styles.rankingSummary}>
        <Text style={styles.summaryTitle}>Current Rankings:</Text>
        <View style={styles.summaryContainer}>
          {[1, 2, 3].map(rank => {
            const selectedMember = members.find(m => m.id === currentRankings[rank]);
            return (
              <View key={rank} style={styles.summaryItem}>
                <Text style={styles.summaryRank}>
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'} {rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}:
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
            disabled={isSubmitting}
          >
            <Text>Previous</Text>
          </TouchableOpacity>
        )}
        
        {confirmedQuestions.includes(currentQuestion) ? (
          <View style={styles.confirmedContainer}>
            <Text style={styles.confirmedText}>✓ Confirmed</Text>
            {currentQuestion < shuffledQuestions.length - 1 && (
              <TouchableOpacity
                style={[styles.navButton, styles.primaryButton]}
                onPress={() => setCurrentQuestion(currentQuestion + 1)}
                disabled={isSubmitting}
              >
                <Text>Next Question</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.navButton, 
              styles.primaryButton,
              (Object.keys(currentRankings).length < 1 || isSubmitting) && styles.disabledButton
            ]}
            onPress={confirmCurrentQuestion}
            disabled={Object.keys(currentRankings).length < 1 || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text>
                {currentQuestion < shuffledQuestions.length - 1 ? 'Confirm & Next' : 'Submit Survey'}
              </Text>
            )}
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
    marginBottom: 15,
    color: '#666',
  },
  rankingSummary: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  summaryContainer: {
    flexDirection: 'column',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  summaryRank: {
    fontSize: 14,
    fontWeight: '600',
    width: 80,
    color: '#333',
  },
  summaryName: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  memberDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  rankingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rankButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  rankButtonText: {
    fontSize: 16,
    marginBottom: 2,
  },
  rankButtonLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  disabledButton: {
    opacity: 0.4,
  },
  disabledText: {
    color: '#ccc',
  },
  selectedRankContainer: {
    alignItems: 'center',
    gap: 8,
  },
  rankBadge: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  rankBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ff4444',
    borderRadius: 15,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
  confirmedText: {
    color: 'green',
    fontWeight: 'bold',
    padding: 10,
  },
  timerContainer: {
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    marginBottom: 15,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timeoutWarning: {
    color: 'red',
    fontWeight: 'bold',
    marginTop: 5,
  },
  penaltyWarning: {
    color: 'red',
    fontWeight: 'bold',
    marginTop: 5,
    textAlign: 'center',
  },
});