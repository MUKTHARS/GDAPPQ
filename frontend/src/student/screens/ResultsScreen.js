import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
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

export default function ResultsScreen({ route, navigation }) {
  const { sessionId } = route.params;
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFeedbackButton, setShowFeedbackButton] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const response = await api.student.getResults(sessionId);
        
        if (response.data?.results) {
          // Process results to ensure all numeric values
          const processedResults = response.data.results.map(item => ({
            ...item,
            total_score: item.total_score || 0,
            penalty_points: item.penalty_points || 0,
            final_score: (item.total_score || 0) - (item.penalty_points || 0)
          }));
          
          setResults(processedResults);
          setShowFeedbackButton(true); // Show feedback button after results load
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

  const handleFeedbackPress = () => {
    navigation.navigate('Feedback', { sessionId });
  };

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
        keyExtractor={item => item.responder_id}
        renderItem={({ item, index }) => <ResultItem item={item} index={index} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No results available for this session</Text>
          </View>
        }
      />

      {showFeedbackButton && (
        <TouchableOpacity 
          style={styles.feedbackButton}
          onPress={handleFeedbackPress}
        >
          <Text style={styles.feedbackButtonText}>Provide Feedback</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  loadingText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#666',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  resultItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
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
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  scoresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreText: {
    color: '#4CAF50',
  },
  penaltyText: {
    color: '#F44336',
  },
  finalScoreText: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
  },
  feedbackButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  feedbackButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});