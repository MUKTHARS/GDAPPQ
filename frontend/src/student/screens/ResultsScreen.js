import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import api from '../services/api';

const ResultItem = ({ item, index }) => {
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
          <Text style={styles.scoreText}>Score: {item.total_score.toFixed(1)}</Text>
          <Text style={styles.penaltyText}>Penalties: -{item.penalty_points}</Text>
          <Text style={styles.finalScoreText}>Final: {item.final_score.toFixed(1)}</Text>
        </View>
      </View>
    </View>
  );
};

export default function ResultsScreen({ route }) {
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
          // Ensure all numeric values are properly set
          const processedResults = response.data.results.map(item => ({
            ...item,
            total_score: item.total_score || 0,
            penalty_points: item.penalty_points || 0,
            final_score: (item.total_score || 0) - (item.penalty_points || 0)
          }));
          setResults(processedResults);
        } else {
          setError('No results available');
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
      <Text style={styles.header}>Group Discussion Results</Text>
      <Text style={styles.subHeader}>Session ID: {sessionId}</Text>
      
      <FlatList
        data={results}
        keyExtractor={item => item.responder_id}
        renderItem={({ item, index }) => <ResultItem item={item} index={index} />}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subHeader: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    color: '#666',
  },
  listContainer: {
    paddingBottom: 20,
  },
  resultItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rankContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    width: 40,
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
    fontWeight: '600',
    marginBottom: 8,
  },
  scoresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  penaltyText: {
    color: '#F44336',
    fontWeight: '500',
  },
  finalScoreText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
});

// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, FlatList, ScrollView, ActivityIndicator } from 'react-native';
// import api from '../services/api';

// export default function ResultsScreen({ navigation, route }) {
//   const { sessionId } = route.params;
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [participants, setParticipants] = useState([]);

//   useEffect(() => {
//     const fetchResults = async () => {
//       try {
//         setLoading(true);
//         const response = await api.student.getResults(sessionId);
        
//         // Handle case where backend returns empty arrays
//         const hasResults = response.data?.results?.length > 0;
//         const hasParticipants = response.data?.participants?.length > 0;
        
//         setResults(hasResults ? response.data.results : []);
//         setParticipants(hasParticipants ? response.data.participants : []);
//       } catch (error) {
//         console.error("Failed to load results:", error);
//       } finally {
//         setLoading(false);
//       }
//     };
    
//     fetchResults();
//   }, [sessionId]);

//   if (loading) {
//     return (
//       <View style={styles.loading}>
//         <ActivityIndicator size="large" />
//         <Text>Calculating results...</Text>
//       </View>
//     );
//   }

//   // Show whatever results we have, even if incomplete
//   const hasResults = results.length > 0;
//   const hasParticipants = participants.length > 0;

//   return (
//     <ScrollView style={styles.container}>
//       <Text style={styles.title}>Session Results</Text>
      
//       {hasResults ? (
//         <>
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Rankings</Text>
//             {results.map((participant, index) => (
//               <View 
//                 key={`result-${participant.responder_id || index}`}
//                 style={[
//                   styles.resultCard,
//                   index === 0 && styles.firstPlace,
//                   index === 1 && styles.secondPlace,
//                   index === 2 && styles.thirdPlace,
//                 ]}
//               >
//                 <Text style={styles.rank}>
//                   {index + 1}
//                 </Text>
//                 <View style={styles.participantInfo}>
//                   <Text style={styles.participantName}>{participant.name}</Text>
//                   <Text style={styles.score}>Score: {participant.total_score.toFixed(1)}</Text>
//                 </View>
//               </View>
//             ))}
//           </View>

//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>All Participants</Text>
//             {participants.map(participant => (
//               <View key={`participant-${participant.id}`} style={styles.participantCard}>
//                 <Text style={styles.participantName}>{participant.name}</Text>
//               </View>
//             ))}
//           </View>
//         </>
//       ) : hasParticipants ? (
//         <View style={styles.section}>
//           <Text style={styles.message}>Results are being calculated...</Text>
//           <Text style={styles.sectionTitle}>Participants</Text>
//           {participants.map(participant => (
//             <View key={`participant-${participant.id}`} style={styles.participantCard}>
//               <Text style={styles.participantName}>{participant.name}</Text>
//             </View>
//           ))}
//         </View>
//       ) : (
//         <View style={styles.section}>
//           <Text style={styles.message}>No participants found for this session</Text>
//         </View>
//       )}
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//     backgroundColor: '#f5f5f5',
//   },
//   loading: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 20,
//     textAlign: 'center',
//     color: '#333',
//   },
//   section: {
//     marginBottom: 20,
//     backgroundColor: 'white',
//     borderRadius: 10,
//     padding: 15,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 10,
//     color: '#333',
//   },
//   resultCard: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 12,
//     marginBottom: 8,
//     borderRadius: 8,
//     backgroundColor: '#f8f9fa',
//   },
//   firstPlace: {
//     borderLeftWidth: 5,
//     borderLeftColor: '#FFD700',
//   },
//   secondPlace: {
//     borderLeftWidth: 5,
//     borderLeftColor: '#C0C0C0',
//   },
//   thirdPlace: {
//     borderLeftWidth: 5,
//     borderLeftColor: '#CD7F32',
//   },
//   rank: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     width: 30,
//     textAlign: 'center',
//     marginRight: 10,
//   },
//   participantInfo: {
//     flex: 1,
//   },
//   participantName: {
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   score: {
//     fontSize: 14,
//     color: '#666',
//   },
//   participantCard: {
//     padding: 12,
//     marginBottom: 8,
//     backgroundColor: '#f8f9fa',
//     borderRadius: 6,
//   },
//   message: {
//     textAlign: 'center',
//     color: '#666',
//     marginBottom: 10,
//   },
// });