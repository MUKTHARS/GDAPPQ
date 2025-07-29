import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import api from '../services/api';
import { ProgressChart } from 'react-native-chart-kit';

export default function ResultsScreen({ navigation, route }) {
  const { sessionId } = route.params;
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
 const sortedScores = [...scores].sort((a, b) => b.score - a.score);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await api.student.getResults(sessionId);
        setResults(response.data);
      } catch (error) {
        alert('Failed to load results');
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

   return (
    <View style={styles.container}>
      <Text style={styles.title}>Survey Results</Text>
      
      <Text style={styles.subtitle}>Qualified Members:</Text>
      <View style={styles.qualifiedContainer}>
        {qualified.map((member, index) => (
          <View key={member.id} style={styles.qualifiedMember}>
            <Text style={styles.qualifiedPosition}>
              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} {index + 1}
            </Text>
            <Text style={styles.qualifiedName}>{member.name}</Text>
            <Text style={styles.qualifiedScore}>{member.score.toFixed(1)} points</Text>
          </View>
        ))}
      </View>

      <Text style={styles.subtitle}>All Participants:</Text>
      <FlatList
        data={sortedScores}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.scoreCard}>
            <Text style={styles.memberName}>{item.name}</Text>
            <View style={styles.scoreDetails}>
              <Text style={styles.scoreText}>{item.score.toFixed(1)} points</Text>
              {item.penalties > 0 && (
                <Text style={styles.penaltyText}>({item.penalties} penalties)</Text>
              )}
            </View>
          </View>
        )}
      />
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