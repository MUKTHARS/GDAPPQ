import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image,ActivityIndicator, TouchableOpacity } from 'react-native';
import api from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const ResultItem = ({ item, index }) => {
  // Ensure numeric values
  const totalScore = typeof item.total_score === 'string' ? 
    parseFloat(item.total_score) : item.total_score || 0;
  const penaltyPoints = typeof item.penalty_points === 'string' ? 
    parseFloat(item.penalty_points) : item.penalty_points || 0;
  const finalScore = typeof item.final_score === 'string' ? 
    parseFloat(item.final_score) : totalScore - penaltyPoints;

  // Use the photo_url from the item, fallback to avatar API
  const profileImage = item.photo_url || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random&color=fff`;

  const getRankIcon = (position) => {
    switch (position) {
      case 0: return 'emoji-events';
      case 1: return 'emoji-events';
      case 2: return 'emoji-events';
      default: return 'person';
    }
  };

  const getRankColors = (position) => {
    switch (position) {
      case 0: return ['#FFD700', '#FFA000']; // Gold
      case 1: return ['#C0C0C0', '#9E9E9E']; // Silver
      case 2: return ['#CD7F32', '#8D6E63']; // Bronze
      default: return ['#4CAF50', '#388E3C']; // Default green
    }
  };

  return (
    <View style={[styles.resultItem, { opacity: 0.9 + (index * 0.01) }]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.resultGradient}
      >
        <View style={styles.resultHeader}>
          <View style={styles.rankContainer}>
            <LinearGradient
              colors={getRankColors(index)}
              style={styles.rankGradient}
            >
              <Icon name={getRankIcon(index)} size={24} color="#fff" />
            </LinearGradient>
            <Text style={styles.rankPosition}>#{index + 1}</Text>
          </View>
          
          {/* Profile Image */}
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: profileImage }}
              style={styles.profileImage}
              onError={(e) => {
                console.log('Image load error:', e.nativeEvent.error);
              }}
            />
          </View>
          
          <View style={styles.detailsContainer}>
            <Text style={styles.nameText}>{item.name}</Text>
            <View style={styles.scoresContainer}>
              <View style={styles.scoreItem}>
                <Icon name="add-circle" size={16} color="#4CAF50" />
                <Text style={styles.scoreText}>{totalScore.toFixed(1)}</Text>
              </View>
              <View style={styles.scoreItem}>
                <Icon name="remove-circle" size={16} color="#F44336" />
                <Text style={styles.penaltyText}>{penaltyPoints.toFixed(1)}</Text>
              </View>
              <View style={styles.finalScoreContainer}>
                <Text style={styles.finalScoreText}>{finalScore.toFixed(1)}</Text>
                <Text style={styles.finalScoreLabel}>Final</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

export default function ResultsScreen({ route, navigation }) {
  const { sessionId } = route.params;
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const response = await api.student.getResults(sessionId);
        
        if (response.data?.results) {
          // Process results to ensure correct data types
          const processedResults = response.data.results
            .map(item => ({
              ...item,
              // Ensure numeric values - handle both string and number types
              total_score: typeof item.total_score === 'string' ? 
                parseFloat(item.total_score) : item.total_score || 0,
              penalty_points: typeof item.penalty_points === 'string' ? 
                parseFloat(item.penalty_points) : item.penalty_points || 0,
              final_score: typeof item.final_score === 'string' ? 
                parseFloat(item.final_score) : 
                (item.total_score || 0) - (item.penalty_points || 0)
            }))
            // Sort by final_score descending as backup
            .sort((a, b) => b.final_score - a.final_score);
          
          setResults(processedResults);
        } else {
          setError('No results available for this session');
        }
      } catch (err) {
        setError('Failed to load results');
        console.error('Results error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId]);

  if (loading) {
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2', '#667eea']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.loadingCardGradient}
            >
              <View style={styles.loadingIconContainer}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
              <Text style={styles.loadingTitle}>Loading Results</Text>
              <Text style={styles.loadingSubtitle}>Please wait while we fetch the session results...</Text>
            </LinearGradient>
          </View>
        </View>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2', '#667eea']}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
            style={styles.errorCard}
          >
            <View style={styles.errorIconContainer}>
              <Icon name="error-outline" size={64} color="rgba(255,255,255,0.8)" />
            </View>
            <Text style={styles.errorTitle}>Unable to Load Results</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity 
              style={styles.backButtonContainer}
              onPress={() => navigation.goBack()}
            >
              <LinearGradient
                colors={['#F44336', '#D32F2F']}
                style={styles.backButtonGradient}
              >
                <Icon name="arrow-back" size={20} color="#fff" />
                <Text style={styles.backButtonText}>Go Back</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#667eea']}
      style={styles.container}
    >
      <View style={styles.contentContainer}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)']}
              style={styles.headerIconGradient}
            >
              <Icon name="emoji-events" size={32} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Session Results</Text>
          <Text style={styles.subtitle}>Final rankings and scores</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
            style={styles.statsGradient}
          >
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Icon name="group" size={24} color="#fff" />
                </View>
                <Text style={styles.statNumber}>{results.length}</Text>
                <Text style={styles.statLabel}>Participants</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Icon name="emoji-events" size={24} color="#FFD700" />
                </View>
                <Text style={styles.statNumber}>
                  {results.length > 0 ? results[0].final_score?.toFixed(1) || '0.0' : '0.0'}
                </Text>
                <Text style={styles.statLabel}>Top Score</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Icon name="check-circle" size={24} color="#4CAF50" />
                </View>
                <Text style={styles.statNumber}>Complete</Text>
                <Text style={styles.statLabel}>Status</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Results List */}
        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>
              Final Rankings ({results.length})
            </Text>
          </View>
          
          <View style={styles.resultsList}>
            {results.length > 0 ? (
              <FlatList
                data={results}
                keyExtractor={(item, index) => item.student_id || `result-${index}`}
                renderItem={({ item, index }) => <ResultItem item={item} index={index} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                  style={styles.emptyGradient}
                >
                  <View style={styles.emptyIconContainer}>
                    <Icon name="assessment" size={48} color="rgba(255,255,255,0.6)" />
                  </View>
                  <Text style={styles.emptyTitle}>No Results Available</Text>
                  <Text style={styles.emptyText}>
                    Results for this session are not yet available
                  </Text>
                </LinearGradient>
              </View>
            )}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingCard: {
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
  },
  loadingCardGradient: {
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  loadingIconContainer: {
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 22,
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
  errorIconContainer: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  backButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  backButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIconContainer: {
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 16,
  },
  headerIconGradient: {
    padding: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  statsContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  statsGradient: {
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
  },
  resultsContainer: {
    flex: 1,
    marginBottom: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  resultsList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 10,
  },
  resultItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
 rankGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankContainer: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 60,
  },
   profileImageContainer: {
    marginRight: 16,
  },
  
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  rankGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  rankPosition: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  detailsContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  scoresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scoreText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 4,
  },
  penaltyText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
    marginLeft: 4,
  },
  finalScoreContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  finalScoreText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  finalScoreLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
});


// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
// import api from '../services/api';

// const ResultItem = ({ item, index }) => {
//   // Ensure numeric values
//   const totalScore = typeof item.total_score === 'string' ? 
//     parseFloat(item.total_score) : item.total_score || 0;
//   const penaltyPoints = typeof item.penalty_points === 'string' ? 
//     parseFloat(item.penalty_points) : item.penalty_points || 0;
//   const finalScore = typeof item.final_score === 'string' ? 
//     parseFloat(item.final_score) : totalScore - penaltyPoints;

//   return (
//     <View style={styles.resultItem}>
//       <View style={styles.rankContainer}>
//         <Text style={styles.rankText}>
//           {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
//         </Text>
//       </View>
//       <View style={styles.detailsContainer}>
//         <Text style={styles.nameText}>{item.name}</Text>
//         <View style={styles.scoresContainer}>
//           <Text style={styles.scoreText}>Score: {totalScore.toFixed(1)}</Text>
//           <Text style={styles.penaltyText}>Penalties: -{penaltyPoints.toFixed(1)}</Text>
//           <Text style={styles.finalScoreText}>Final: {finalScore.toFixed(1)}</Text>
//         </View>
//       </View>
//     </View>
//   );
// };

// export default function ResultsScreen({ route, navigation }) {
//   const { sessionId } = route.params;
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [showFeedbackButton, setShowFeedbackButton] = useState(false);

//   useEffect(() => {
//     const fetchResults = async () => {
//       try {
//         setLoading(true);
//         const response = await api.student.getResults(sessionId);
        
//         if (response.data?.results) {
//           // Process results to ensure correct sorting and numeric values
//           const processedResults = response.data.results
//             .map(item => ({
//               ...item,
//               total_score: typeof item.total_score === 'string' ? 
//                 parseFloat(item.total_score) : item.total_score || 0,
//               penalty_points: typeof item.penalty_points === 'string' ? 
//                 parseFloat(item.penalty_points) : item.penalty_points || 0,
//               final_score: typeof item.final_score === 'string' ? 
//                 parseFloat(item.final_score) : 
//                 (item.total_score || 0) - (item.penalty_points || 0)
//             }))
//             // Sort by final score descending
//             .sort((a, b) => b.final_score - a.final_score);
          
//           setResults(processedResults);
//           setShowFeedbackButton(true);
//         } else {
//           setError('No results available for this session');
//         }
//       } catch (err) {
//         setError('Failed to load results');
//         console.error('Results error:', err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchResults();
//   }, [sessionId]);


//   const handleFeedbackPress = () => {
//     navigation.navigate('Feedback', { sessionId });
//   };

//   if (loading) {
//     return (
//       <View style={styles.container}>
//         <ActivityIndicator size="large" />
//         <Text style={styles.loadingText}>Loading session results...</Text>
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
//       <Text style={styles.header}>Session Results</Text>
      
//       <FlatList
//         data={results}
//         keyExtractor={item => item.responder_id}
//         renderItem={({ item, index }) => <ResultItem item={item} index={index} />}
//         contentContainerStyle={styles.listContainer}
//         ListEmptyComponent={
//           <View style={styles.emptyContainer}>
//             <Text style={styles.emptyText}>No results available for this session</Text>
//           </View>
//         }
//       />

//       {showFeedbackButton && (
//         <TouchableOpacity 
//           style={styles.feedbackButton}
//           onPress={handleFeedbackPress}
//         >
//           <Text style={styles.feedbackButtonText}>Provide Feedback</Text>
//         </TouchableOpacity>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//     backgroundColor: '#f5f5f5',
//   },
//   header: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     marginBottom: 20,
//     textAlign: 'center',
//     color: '#333',
//   },
//   loadingText: {
//     marginTop: 10,
//     textAlign: 'center',
//     color: '#666',
//   },
//   errorText: {
//     color: 'red',
//     fontSize: 16,
//     textAlign: 'center',
//   },
//   listContainer: {
//     paddingBottom: 20,
//   },
//   resultItem: {
//     flexDirection: 'row',
//     backgroundColor: '#fff',
//     borderRadius: 8,
//     padding: 15,
//     marginBottom: 10,
//     elevation: 2,
//   },
//   rankContainer: {
//     width: 50,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   rankText: {
//     fontSize: 20,
//     fontWeight: 'bold',
//   },
//   detailsContainer: {
//     flex: 1,
//   },
//   nameText: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginBottom: 5,
//   },
//   scoresContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   scoreText: {
//     color: '#4CAF50',
//   },
//   penaltyText: {
//     color: '#F44336',
//   },
//   finalScoreText: {
//     fontWeight: 'bold',
//     color: '#2196F3',
//   },
//   emptyContainer: {
//     alignItems: 'center',
//     padding: 20,
//   },
//   emptyText: {
//     color: '#666',
//     fontStyle: 'italic',
//   },
//   feedbackButton: {
//     backgroundColor: '#2196F3',
//     padding: 15,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginTop: 10,
//     marginBottom: 20,
//   },
//   feedbackButtonText: {
//     color: 'white',
//     fontWeight: 'bold',
//     fontSize: 16,
//   },
// });