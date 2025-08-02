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
 
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        setLoading(true);
         console.log('Starting participant fetch...');
        const response = await api.student.getSessionParticipants(sessionId);
         console.log('Participants response:', response);
          if (!response.data) {
        console.error('No data in participants response');
        throw new Error('No participants data received');
      }
        const authData = await auth.getAuthData();
        console.log('Auth data:', authData);
        const participants = response.data?.data || [];
         console.log('Raw participants:', participants);
        const filteredParticipants = participants.filter(
          participant => participant.id !== authData.userId
        );
        console.log('Filtered participants:', filteredParticipants);
        
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
           console.log('Initialized selections:', newSelections);
        return newSelections;
        });
      } catch (err) {
         console.error('Failed to fetch participants:', {
        error: err,
        message: err.message,
        stack: err.stack
      });
        setError('Failed to load participants');
        setMembers([]);
      } finally {
        console.log('Participant fetch completed');
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
  console.log('Confirm button pressed for question:', currentQuestion + 1);
  
  const currentSelections = selections[currentQuestion] || {};
  console.log('Current selections:', currentSelections);
  
  const selectedRanks = Object.keys(currentSelections).length;
  console.log('Number of rankings selected:', selectedRanks);
  
  if (selectedRanks < 3) {
    console.log('Validation failed - need 3 rankings');
    alert('Please select all 3 rankings for this question');
    return;
  }

  setIsSubmitting(true);
  console.log('Submitting question...');

  try {
    const responseData = {
      sessionId,
      responses: {
        [currentQuestion + 1]: currentSelections
      }
    };
    console.log('Prepared submission data:', JSON.stringify(responseData, null, 2));

    // First attempt
    let response = await api.student.submitSurvey(responseData).catch(error => {
      if (error.response?.status === 409) {
        console.log('Survey already submitted for this question, continuing...');
        return { data: { status: 'success' } };
      }
      throw error;
    });

    // If first attempt fails with 500, try again after a short delay
    if (response?.status === 500 || response?.data?.error) {
      console.log('First attempt failed, retrying...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      response = await api.student.submitSurvey(responseData).catch(error => {
        if (error.response?.status === 409) {
          return { data: { status: 'success' } };
        }
        throw error;
      });
    }

    console.log('API response:', response);

    if (response.error && response.error !== 'Survey already submitted') {
      console.error('API returned error:', response.error);
      throw new Error(response.error);
    }

    console.log('Submission successful, marking question as confirmed');
    setConfirmedQuestions(prev => [...prev, currentQuestion]);
    
    if (currentQuestion < questions.length - 1) {
      console.log('Moving to next question');
      setCurrentQuestion(prev => prev + 1);
    } else {
      console.log('All questions completed, navigating to results');
      navigation.navigate('Results', { sessionId });
    }
  } catch (error) {
    console.error('Error in confirmCurrentQuestion:', error);
    
    // More specific error messages based on error type
    let errorMessage = 'Failed to save question rankings';
    if (error.response) {
      if (error.response.status === 500) {
        errorMessage = 'Server is currently unavailable. Please try again later.';
      } else if (error.response.data?.error) {
        errorMessage = error.response.data.error;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    alert(errorMessage);
  } finally {
    console.log('Submission process completed');
    setIsSubmitting(false);
  }
};

const handleSubmit = async () => {
  try {
    // Convert selections to the required format
    const formattedResponses = {};
    Object.keys(selections).forEach(questionIndex => {
      const questionNum = parseInt(questionIndex) + 1; // Convert to 1-based index
      const rankings = selections[questionIndex];
      
      // Convert rankings to the expected format (rank -> student_id)
      formattedResponses[questionNum] = {};
      Object.keys(rankings).forEach(rank => {
        const rankNum = parseInt(rank);
        if (rankings[rank]) {  // Only include if there's a value
          formattedResponses[questionNum][rankNum] = rankings[rank];
        }
      });
    });

    await api.student.submitSurvey({
      sessionId,
      responses: formattedResponses
    });
    navigation.navigate('Results', { sessionId });
  } catch (error) {
    console.error('Survey submission error:', error);
    alert('Failed to submit survey: ' + (error.message || 'Unknown error'));
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
  
  // Ranking Summary Styles
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

  // Member Card Styles
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

  // Ranking Buttons (when not selected)
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

  // Selected Rank Display
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

  // Navigation Styles
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
});