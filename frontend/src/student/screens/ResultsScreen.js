// frontend/src/student/screens/ResultsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import api from '../services/api';
import auth from '../services/auth';

const ResultsScreen = ({ navigation, route }) => {
  const { sessionId } = route.params;
  const [results, setResults] = useState({
    qualified: true,
    next_level: 1,
    final_score: 5,
    feedback: '',
    is_approved: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const authData = await auth.getAuthData();
        
        // Get results with student ID from auth
        const response = await api.student.getResults({ 
          session_id: sessionId,
          student_id: authData.userId 
        });
        
        if (!response.data) {
          throw new Error('No results data received');
        }

        // Safely handle the response data with defaults
        setResults({
          qualified: response.data.qualified || false,
          next_level: response.data.next_level || 0,
          final_score: response.data.final_score || 0,
          feedback: response.data.feedback || '',
          is_approved: response.data.is_approved || false
        });
        setError(null);
      } catch (error) {
        console.error('Failed to load results:', error);
        setError(error.response?.data?.error || error.message || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
    
    // Refresh every 5 seconds if results aren't ready
    const interval = setInterval(() => {
      if (!results && !error?.includes('being calculated')) {
        fetchResults();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [sessionId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Calculating your results...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        {error.includes('being calculated') && (
          <Text style={styles.infoText}>This may take a few minutes</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your GD Results</Text>
      
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Final Score:</Text>
        <Text style={styles.scoreValue}>
          {results.final_score ? results.final_score.toFixed(2) : '0.00'}
        </Text>
      </View>
      
      <View style={[
        styles.qualificationContainer,
        results.qualified ? styles.qualified : styles.notQualified
      ]}>
        <Text style={styles.qualificationText}>
          {results.qualified ? 
            `Qualified for Level ${results.next_level || 1}` : 
            'Not Qualified'}
        </Text>
      </View>
      
      {results.feedback && (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackTitle}>Feedback:</Text>
          <Text style={styles.feedbackText}>{results.feedback}</Text>
        </View>
      )}
      
      {!results.is_approved && (
        <Text style={styles.pendingText}>
          *Pending faculty approval
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scoreValue: {
    fontSize: 18,
  },
  qualificationContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  qualified: {
    backgroundColor: '#d4edda',
  },
  notQualified: {
    backgroundColor: '#f8d7da',
  },
  qualificationText: {
    fontSize: 18,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  feedbackContainer: {
    marginBottom: 20,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  feedbackText: {
    fontSize: 16,
  },
  pendingText: {
    fontStyle: 'italic',
    color: '#6c757d',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 10,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  infoText: {
    textAlign: 'center',
    color: '#6c757d',
  },
});

export default ResultsScreen;

// // frontend/src/student/screens/ResultsScreen.js
// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
// import api from '../services/api';

// const ResultsScreen = ({ navigation, route }) => {
//   const { sessionId } = route.params;
//   const [results, setResults] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchResults = async () => {
//       try {
//         const response = await api.student.getResults(sessionId);
//         setResults(response.data);
//       } catch (error) {
//         console.error('Failed to load results:', error);
//       } finally {
//         setLoading(false);
//       }
//     };
    
//     fetchResults();
//   }, [sessionId]);

//   if (loading) {
//     return (
//       <View style={styles.container}>
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   if (!results) {
//     return (
//       <View style={styles.container}>
//         <Text>Results not available yet</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Your GD Results</Text>
      
//       <View style={styles.scoreContainer}>
//         <Text style={styles.scoreLabel}>Final Score:</Text>
//         <Text style={styles.scoreValue}>{results.final_score.toFixed(2)}</Text>
//       </View>
      
//       <View style={styles.qualificationContainer}>
//         <Text style={styles.qualificationText}>
//           {results.qualified ? 
//             `Qualified for Level ${results.next_level}` : 
//             'Not Qualified'}
//         </Text>
//       </View>
      
//       {results.feedback && (
//         <View style={styles.feedbackContainer}>
//           <Text style={styles.feedbackTitle}>Feedback:</Text>
//           <Text style={styles.feedbackText}>{results.feedback}</Text>
//         </View>
//       )}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 16,
//     backgroundColor: '#f5f5f5',
//   },
//   userResultCard: {
//     backgroundColor: 'white',
//     borderRadius: 8,
//     padding: 16,
//     marginBottom: 16,
//     elevation: 2,
//   },
//   qualifiedCard: {
//     borderLeftWidth: 4,
//     borderLeftColor: 'green',
//   },
//   userResultTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 8,
//   },
//   userScore: {
//     fontSize: 16,
//     marginBottom: 4,
//   },
//   userPenalties: {
//     fontSize: 16,
//     marginBottom: 4,
//     color: '#666',
//   },
//   userQualified: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginTop: 8,
//     color: 'green',
//   },
//   resultsTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 16,
//   },
//   resultCard: {
//     backgroundColor: 'white',
//     borderRadius: 8,
//     padding: 16,
//     marginBottom: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//     elevation: 1,
//   },
//   qualifiedResult: {
//     borderLeftWidth: 4,
//     borderLeftColor: 'green',
//   },
//   rank: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginRight: 16,
//     width: 40,
//     textAlign: 'center',
//   },
//   resultDetails: {
//     flex: 1,
//   },
//   studentName: {
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   score: {
//     fontSize: 14,
//     color: '#666',
//   },
//   qualifiedBadge: {
//     backgroundColor: 'green',
//     color: 'white',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   errorText: {
//     color: 'red',
//   },
// });

// export default ResultsScreen;