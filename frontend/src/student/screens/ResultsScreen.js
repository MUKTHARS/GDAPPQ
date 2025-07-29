// frontend/src/student/screens/ResultsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../services/api';

const ResultsScreen = ({ navigation, route }) => {
  const { sessionId } = route.params;
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await api.student.getResults(sessionId);
        setResults(response.data);
      } catch (error) {
        console.error('Failed to load results:', error);
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

  if (!results) {
    return (
      <View style={styles.container}>
        <Text>Results not available yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your GD Results</Text>
      
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Final Score:</Text>
        <Text style={styles.scoreValue}>{results.final_score.toFixed(2)}</Text>
      </View>
      
      <View style={styles.qualificationContainer}>
        <Text style={styles.qualificationText}>
          {results.qualified ? 
            `Qualified for Level ${results.next_level}` : 
            'Not Qualified'}
        </Text>
      </View>
      
      {results.feedback && (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackTitle}>Feedback:</Text>
          <Text style={styles.feedbackText}>{results.feedback}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  userResultCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  qualifiedCard: {
    borderLeftWidth: 4,
    borderLeftColor: 'green',
  },
  userResultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  userScore: {
    fontSize: 16,
    marginBottom: 4,
  },
  userPenalties: {
    fontSize: 16,
    marginBottom: 4,
    color: '#666',
  },
  userQualified: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    color: 'green',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
  },
  qualifiedResult: {
    borderLeftWidth: 4,
    borderLeftColor: 'green',
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 16,
    width: 40,
    textAlign: 'center',
  },
  resultDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  score: {
    fontSize: 14,
    color: '#666',
  },
  qualifiedBadge: {
    backgroundColor: 'green',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
  },
});

export default ResultsScreen;