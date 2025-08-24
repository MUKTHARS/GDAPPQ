import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image,ActivityIndicator, Alert } from 'react-native';
import api from '../services/api';
import auth from '../services/auth'; 
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

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
      case 1: return ['#FFD700', '#FFA000']; // Gold gradient
      case 2: return ['#E0E0E0', '#BDBDBD']; // Silver gradient
      case 3: return ['#CD7F32', '#A0522D']; // Bronze gradient
      default: return ['#667eea', '#764ba2'];
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
    <View style={styles.memberCardContainer}>
      <LinearGradient
        colors={isSelected 
          ? ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)']
          : ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[styles.memberCard, isSelected && styles.selectedCard]}
      >
        {/* Member Info Section */}
        <View style={styles.memberInfoContainer}>
          <View style={styles.profileImageContainer}>
            <LinearGradient
              colors={['#4CAF50', '#43A047']}
              style={styles.profileImageGradient}
            >
              <Image
                source={{ uri: member.profileImage || 'https://via.placeholder.com/50' }}
                style={styles.profileImage}
                onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
              />
              {!member.profileImage && (
                <Icon name="person" size={32} color="#fff" style={styles.defaultProfileIcon} />
              )}
            </LinearGradient>
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={styles.memberEmail}>{member.email}</Text>
            {member.department && (
              <View style={styles.departmentContainer}>
                <Icon name="domain" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.memberDepartment}>{member.department}</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Selection Status */}
        {isSelected ? (
          <View style={styles.selectedRankContainer}>
            <LinearGradient
              colors={getRankColor(currentRank)}
              style={styles.rankBadge}
            >
              <Text style={styles.rankBadgeText}>{getRankLabel(currentRank)}</Text>
            </LinearGradient>
            <TouchableOpacity
              style={styles.removeButtonContainer}
              onPress={() => onSelect(currentRank, null)}
            >
              <LinearGradient
                colors={['#FF5252', '#F44336']}
                style={styles.removeButton}
              >
                <Icon name="close" size={16} color="#fff" />
                <Text style={styles.removeButtonText}>Remove</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.rankingButtons}>
            {[1, 2, 3].map(rank => {
              const isRankTaken = Object.values(currentRankings).includes(member.id) || currentRankings[rank];
              return (
                <TouchableOpacity
                  key={rank}
                  style={styles.rankButtonContainer}
                  onPress={() => !isRankTaken && onSelect(rank, member.id)}
                  disabled={!!isRankTaken}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isRankTaken 
                      ? ['rgba(158,158,158,0.6)', 'rgba(117,117,117,0.6)'] 
                      : getRankColor(rank)}
                    style={[styles.rankButton, isRankTaken && styles.disabledRankButton]}
                  >
                    <Text style={[styles.rankButtonEmoji, isRankTaken && styles.disabledText]}>
                      {rank === 1 && '🥇'}
                      {rank === 2 && '🥈'}
                      {rank === 3 && '🥉'}
                    </Text>
                    <Text style={[styles.rankButtonLabel, isRankTaken && styles.disabledText]}>
                      {rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Selection Glow Effect */}
        {isSelected && (
          <View style={styles.selectionGlow} />
        )}
      </LinearGradient>
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

export default function SurveyScreen({ navigation, route }) {
  const { sessionId } = route.params;
  const [allQuestions, setAllQuestions] = useState([]);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [questions, setQuestions] = useState([]);
  
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
        const seed = `${authData.userId}-${sessionId}`;
        setUserSeed(seed);
      } catch (error) {
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
    const studentLevel = parseInt(authData.level) || 1;
    console.log('Student level from auth:', studentLevel);
    
    const questionsResponse = await api.get('/student/questions', {
      params: { 
        level: studentLevel,
        session_id: sessionId,
      }
    });
    
    console.log('Questions API response status:', questionsResponse.status);
    console.log('Questions API response data:', questionsResponse.data);
    
    let questionsData = questionsResponse.data;
    
    if (questionsData && typeof questionsData === 'object' && !Array.isArray(questionsData)) {
      if (questionsData.data && Array.isArray(questionsData.data)) {
        questionsData = questionsData.data;
      } else if (Array.isArray(questionsData)) {
        // Already an array
      } else {
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
    
    let numericSeed = 0;
    for (let i = 0; i < userSeed.length; i++) {
      numericSeed = (numericSeed * 31 + userSeed.charCodeAt(i)) % 1000000;
    }
    
    const shuffled = seededShuffle(questionsData, numericSeed);
    setShuffledQuestions(shuffled);
    setQuestions(shuffled);
    
    const initialSelections = {};
    shuffled.forEach((_, index) => {
      initialSelections[index] = {};
    });
    setSelections(initialSelections);
    
  } catch (error) {
    console.error('Questions fetch error:', error.response?.data || error.message);
    const defaultQuestions = [
      { id: 'q1', text: 'Clarity of arguments', weight: 1.0 },
      { id: 'q2', text: 'Contribution to discussion', weight: 1.0 },
      { id: 'q3', text: 'Teamwork and collaboration', weight: 1.0 }
    ];
    
    setAllQuestions(defaultQuestions);
    
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
            
            await api.student.startQuestionTimer(sessionId, currentQuestion + 1);
            
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
                            proceedToNextQuestion(true);
                        } catch (err) {
                            console.log('Penalty application error:', err);
                        }
                    }
                }
            ]
        );
        return;
    }

    proceedToNextQuestion(true);
};

const proceedToNextQuestion = async (isPartial = false) => {
    setIsSubmitting(true);
    
    try {
        const currentSelections = selections[currentQuestion] || {};
        if (Object.keys(currentSelections).length > 0) {
            const shuffledQuestion = shuffledQuestions[currentQuestion];
            const questionNumber = currentQuestion + 1;
            
            const isFinal = !isPartial && (currentQuestion === shuffledQuestions.length - 1);
            
            const responseData = {
                sessionId,
                responses: {
                    [questionNumber]: currentSelections
                },
                isPartial: isPartial,
                isFinal: isFinal
            };
            
            console.log('Submitting survey data - isFinal:', isFinal, 'isPartial:', isPartial);
            await api.student.submitSurvey(responseData, isFinal);
        }

        setConfirmedQuestions(prev => [...prev, currentQuestion]);
        
        if (currentQuestion === shuffledQuestions.length - 1) {
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

  if (loading) {
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2', '#667eea']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
            style={styles.loadingCard}
          >
            <View style={styles.loadingIconContainer}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
            <Text style={styles.loadingTitle}>Loading Survey</Text>
            <Text style={styles.loadingSubtitle}>Preparing your evaluation form...</Text>
          </LinearGradient>
        </View>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
            style={styles.errorCard}
          >
            <Icon name="error-outline" size={48} color="rgba(255,255,255,0.8)" />
            <Text style={styles.errorText}>{error}</Text>
          </LinearGradient>
        </View>
      </LinearGradient>
    );
  }

  const currentRankings = selections[currentQuestion] || {};

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#667eea']}
      style={styles.container}
    >
      <View style={styles.contentContainer}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Peer Evaluation</Text>
          <Text style={styles.headerSubtitle}>Rate your teammates' performance</Text>
        </View>

        {/* Compact Timer & Question Section */}
        <View style={styles.topSection}>
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
            style={styles.topSectionGradient}
          >
            {/* Timer Row */}
            <View style={styles.timerRow}>
              <View style={styles.timerContainer}>
                <Icon name="timer" size={20} color="#fff" />
                <Text style={styles.timerText}>{timeRemaining}s</Text>
              </View>
              {isTimedOut && (
                <View style={styles.timeoutBadge}>
                  <Icon name="warning" size={16} color="#FF5252" />
                  <Text style={styles.timeoutText}>Time's Up!</Text>
                </View>
              )}
              {penalties[currentQuestion] && (
                <View style={styles.penaltyBadge}>
                  <Icon name="report" size={16} color="#FF9800" />
                  <Text style={styles.penaltyText}>Penalty</Text>
                </View>
              )}
            </View>
            
            {/* Question Row */}
            <View style={styles.questionRow}>
              <Text style={styles.questionNumber}>Q{currentQuestion + 1}</Text>
              <Text style={styles.question}>
                {shuffledQuestions[currentQuestion]?.text || 'Question loading...'}
              </Text>
            </View>

            {/* Current Rankings Row */}
            <View style={styles.rankingsRow}>
              <Text style={styles.rankingsLabel}>Current Rankings:</Text>
              <View style={styles.rankingsList}>
                {[1, 2, 3].map(rank => {
                  const selectedMember = members.find(m => m.id === currentRankings[rank]);
                  return (
                    <View key={rank} style={styles.rankingItem}>
                      <Text style={styles.rankEmoji}>
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                      </Text>
                      <Text style={styles.rankingName}>
                        {selectedMember ? selectedMember.name : 'Not selected'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </LinearGradient>
        </View>


        {/* Main Participants List */}
        <View style={styles.participantsSection}>
          <Text style={styles.participantsTitle}>
            Participants ({members.length})
          </Text>
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
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.participantsList}
          />
        </View>

        {/* Bottom Navigation */}
        <View style={styles.navigationContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
            style={styles.navigationGradient}
          >
            <View style={styles.navigation}>
              {currentQuestion > 0 && (
                <TouchableOpacity
                  style={styles.navButtonContainer}
                  onPress={() => setCurrentQuestion(currentQuestion - 1)}
                  disabled={isSubmitting}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)']}
                    style={styles.navButton}
                  >
                    <Icon name="arrow-back" size={20} color="#fff" />
                    <Text style={styles.navButtonText}>Previous</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              
              <View style={styles.centerAction}>
                {confirmedQuestions.includes(currentQuestion) ? (
                  <View style={styles.confirmedContainer}>
                    <LinearGradient
                      colors={['#4CAF50', '#43A047']}
                      style={styles.confirmedBadge}
                    >
                      <Icon name="check-circle" size={20} color="#fff" />
                      <Text style={styles.confirmedText}>Confirmed</Text>
                    </LinearGradient>
                    {currentQuestion < shuffledQuestions.length - 1 && (
                      <TouchableOpacity
                        style={styles.nextButtonContainer}
                        onPress={() => setCurrentQuestion(currentQuestion + 1)}
                        disabled={isSubmitting}
                      >
                        <LinearGradient
                          colors={['#2196F3', '#1976D2']}
                          style={styles.nextButton}
                        >
                          <Text style={styles.nextButtonText}>Next Question</Text>
                          <Icon name="arrow-forward" size={20} color="#fff" />
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.confirmButtonContainer}
                    onPress={confirmCurrentQuestion}
                    disabled={Object.keys(currentRankings).length < 1 || isSubmitting}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={(Object.keys(currentRankings).length < 1 || isSubmitting)
                        ? ['rgba(158,158,158,0.8)', 'rgba(117,117,117,0.8)']
                        : currentQuestion < shuffledQuestions.length - 1 
                          ? ['#4CAF50', '#43A047'] 
                          : ['#FF9800', '#F57C00']}
                      style={styles.confirmButton}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <>
                          <Text style={styles.confirmButtonText}>
                            {currentQuestion < shuffledQuestions.length - 1 ? 'Confirm & Next' : 'Submit Survey'}
                          </Text>
                          <Icon 
                            name={currentQuestion < shuffledQuestions.length - 1 ? "check" : "send"} 
                            size={20} 
                            color="#fff" 
                          />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingTop: 25,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    width: '100%',
  },
  loadingIconContainer: {
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    width: '100%',
  },
  errorText: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIconContainer: {
    borderRadius: 25,
    padding: 12,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  topSection: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  topSectionGradient: {
    padding: 16,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  timeoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,82,82,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeoutText: {
    color: '#FF5252',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  penaltyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,152,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  penaltyText: {
    color: '#FF9800',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
    minWidth: 40,
    textAlign: 'center',
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    lineHeight: 22,
  },
  rankingsRow: {
    marginTop: 8,
  },
  rankingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  rankingsList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rankingItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  rankEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  rankingName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  instructionsContainer: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  instructionsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  instructions: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
  participantsSection: {
    flex: 1,
    marginBottom: 16,
  },
  participantsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  participantsList: {
    paddingBottom: 10,
  },
  memberCardContainer: {
    marginBottom: 16,
  },
  memberCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  selectedCard: {
    shadowColor: '#FFD700',
    shadowOpacity: 0.5,
    elevation: 12,
  },
  selectionGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.6)',
  },
  memberInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImageContainer: {
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  profileImageGradient: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 60,
  },
  defaultProfileIcon: {
    position: 'absolute',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  departmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberDepartment: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
    marginLeft: 4,
  },
  selectedRankContainer: {
    alignItems: 'center',
    gap: 12,
  },
  rankBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  rankBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
  },
  removeButtonContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  rankingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  rankButtonContainer: {
    borderRadius: 25,
    overflow: 'hidden',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  rankButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledRankButton: {
    opacity: 0.5,
  },
  rankButtonEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  rankButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  disabledText: {
    color: 'rgba(255,255,255,0.5)',
  },
  navigationContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  navigationGradient: {
    padding: 16,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  centerAction: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  confirmedContainer: {
    alignItems: 'center',
    gap: 12,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  confirmedText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  nextButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  confirmButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 8,
  },
});