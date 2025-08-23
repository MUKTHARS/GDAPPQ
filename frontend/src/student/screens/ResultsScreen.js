import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import api from '../services/api';

const ResultItem = ({ item, index }) => {
  // Ensure numeric values
  const totalScore = typeof item.total_score === 'string' ? 
    parseFloat(item.total_score) : item.total_score || 0;
  const penaltyPoints = typeof item.penalty_points === 'string' ? 
    parseFloat(item.penalty_points) : item.penalty_points || 0;
  const finalScore = typeof item.final_score === 'string' ? 
    parseFloat(item.final_score) : totalScore - penaltyPoints;

  return (
    <View style={styles.resultItem}>
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>
          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
        </Text>
      </View>
      <View style={styles.detailsContainer}>
        <Text style={styles.nameText}>{item.name}</Text>
        <View style={styles.scoresContainer}>
          <Text style={styles.scoreText}>Received: {totalScore.toFixed(1)}</Text>
          <Text style={styles.penaltyText}>Penalties: -{penaltyPoints.toFixed(1)}</Text>
          <Text style={styles.finalScoreText}>Final: {finalScore.toFixed(1)}</Text>
        </View>
      </View>
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
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading session results...</Text>
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
      <Text style={styles.header}>Session Results</Text>
      
      <FlatList
        data={results}
        keyExtractor={(item, index) => item.student_id || `result-${index}`}
        renderItem={({ item, index }) => <ResultItem item={item} index={index} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No results available for this session</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  resultItem: {
    flexDirection: 'row',
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  rankContainer: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  detailsContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  scoresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreText: {
    color: 'green',
  },
  penaltyText: {
    color: 'red',
  },
  finalScoreText: {
    fontWeight: 'bold',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
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