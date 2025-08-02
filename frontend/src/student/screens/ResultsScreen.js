import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList,ScrollView } from 'react-native';
import api from '../services/api';
import { ProgressChart } from 'react-native-chart-kit';

export default function ResultsScreen({ navigation, route }) {
  const { sessionId } = route.params;
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        console.log("Fetching results for session:", sessionId);
        const response = await api.student.getResults(sessionId);
        console.log("Results response:", response.data);
        
        if (!response.data) {
          throw new Error("No data received");
        }
        
        setResults(response.data);
      } catch (error) {
        console.error("Failed to load results:", error);
        alert('Failed to load results: ' + (error.response?.data?.error || error.message));
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [sessionId]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text>Loading results...</Text>
      </View>
    );
  }

  if (!results) {
    return (
      <View style={styles.container}>
        <Text>No results available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Survey Results</Text>
      
      <Text style={styles.subtitle}>Your Performance:</Text>
      <View style={styles.scoreCard}>
        <Text>Leadership: {results.scores?.leadership?.toFixed(1) || '0.0'}</Text>
        <Text>Communication: {results.scores?.communication?.toFixed(1) || '0.0'}</Text>
        <Text>Teamwork: {results.scores?.teamwork?.toFixed(1) || '0.0'}</Text>
        <Text style={styles.qualifiedText}>
          {results.qualified ? "✅ Qualified for next level!" : "❌ Not qualified yet"}
        </Text>
      </View>

      <Text style={styles.subtitle}>Feedback:</Text>
      <Text style={styles.feedback}>{results.feedback || "No feedback available"}</Text>

      {results.participants?.length > 0 && (
        <>
          <Text style={styles.subtitle}>Participants:</Text>
          <FlatList
            data={results.participants}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.participantCard}>
                <Text>{item.name}</Text>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 10
  },
  qualifiedContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    elevation: 3
  },
  qualifiedMember: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  qualifiedPosition: {
    fontSize: 18,
    fontWeight: 'bold',
    width: 50
  },
  qualifiedName: {
    flex: 1,
    fontSize: 16
  },
  qualifiedScore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF'
  },
  scoreCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  memberName: {
    fontSize: 16,
    flex: 1
  },
  scoreDetails: {
    alignItems: 'flex-end'
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600'
  },
  penaltyText: {
    fontSize: 12,
    color: '#FF3B30'
  }
});