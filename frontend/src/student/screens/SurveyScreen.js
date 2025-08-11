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

export default function SurveyScreen({ navigation, route }) {
  const { sessionId } = route.params;
  const questions = [
    "Clarity of arguments",
    "Contribution to discussion",
    "Teamwork and collaboration",
    "Logical reasoning",
    "Communication skills"
  ];
  const [confirmedQuestions, setConfirmedQuestions] = useState([]);
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
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [penalties, setPenalties] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer management
  useEffect(() => {
    let timerInterval;
    
    const startTimer = async () => {
      try {
        // Reset timer state for new question
        setIsTimedOut(false);
        setTimeRemaining(30);
        
        // Start the timer on the server
        await api.student.startQuestionTimer(sessionId, currentQuestion + 1);
        
        // Start local countdown
        timerInterval = setInterval(() => {
          setTimeRemaining(prev => {
            if (prev <= 1) {
              clearInterval(timerInterval);
              setIsTimedOut(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        // Check timeout status periodically
        const checkTimeout = async () => {
          try {
            const response = await api.student.checkQuestionTimeout(
              sessionId, 
              currentQuestion + 1
            );
            
            if (response.data?.is_timed_out && !penalties[currentQuestion]) {
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
            }
          } catch (err) {
            console.log('Timeout check error:', err);
          }
        };
        
        const timeoutCheckInterval = setInterval(checkTimeout, 5000);
        return () => clearInterval(timeoutCheckInterval);
      } catch (err) {
        console.log('Timer setup error:', err);
        // Fallback to client-side timer if server fails
        timerInterval = setInterval(() => {
          setTimeRemaining(prev => {
            if (prev <= 1) {
              clearInterval(timerInterval);
              setIsTimedOut(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    };
    
    startTimer();
    
    return () => {
      clearInterval(timerInterval);
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
          questions.forEach((_, index) => {
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

    fetchParticipants();
}, [sessionId]);

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
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
    } else {
        // Navigate to waiting screen instead of results
        navigation.replace('Waiting', { sessionId });
    }
 const hasAtLeastOneRank = Object.keys(currentSelections).length > 0;
    
    // if (!hasAllRanks) {
    if (!hasAtLeastOneRank) {
        alert('Please select at least one ranking for this question');
        return;
    }

    // Ensure we have exactly 3 rankings for this question
    // const requiredRanks = [1, 2, 3];
    // const hasAllRanks = requiredRanks.every(rank => currentSelections[rank]);
    
    // if (!hasAllRanks) {
    //     alert('Please select all 3 rankings for this question');
    //     return;
    // }
 const formattedRankings = {};
    Object.keys(currentSelections).forEach(rank => {
        const rankNum = parseInt(rank);
        if (currentSelections[rank]) {
            formattedRankings[rankNum] = currentSelections[rank];
        }
    });

    // Ensure at least one ranking is selected
    if (Object.keys(formattedRankings).length === 0) {
        alert('Please select at least one ranking for this question');
        return;
    }
    setIsSubmitting(true);
    
    try {
        const responseData = {
            sessionId,
            responses: {
                [currentQuestion + 1]: currentSelections
            }
        };

        // First try submitting normally
        let response = await api.student.submitSurvey(responseData).catch(error => {
            if (error.response?.status === 409) {
                return { data: { status: 'success' } };
            }
            throw error;
        });
 if (currentQuestion === questions.length - 1) {
            try {
                await api.student.markSurveyCompleted(sessionId);
            } catch (err) {
                console.log('Error marking survey completed:', err);
            }
        }
        // If server error, try again after delay
        if (response?.status === 500 || response?.data?.error) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            response = await api.student.submitSurvey(responseData).catch(error => {
                if (error.response?.status === 409) {
                    return { data: { status: 'success' } };
                }
                throw error;
            });
        }

        setConfirmedQuestions(prev => [...prev, currentQuestion]);
      
    } catch (error) {
        let errorMessage = 'Failed to save question rankings';
        if (error.response) {
            if (error.response.status === 400) {
                errorMessage = 'Please select all 3 rankings for each question';
            } else if (error.response.status === 500) {
                errorMessage = 'Server is currently unavailable. Please try again later.';
            } else if (error.response.data?.error) {
                errorMessage = error.response.data.error;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        alert(errorMessage);
    } finally {
        setIsSubmitting(false);
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
        Q{currentQuestion + 1}: {questions[currentQuestion]}
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
            {currentQuestion < questions.length - 1 && (
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
                {currentQuestion < questions.length - 1 ? 'Confirm & Next' : 'Submit Survey'}
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