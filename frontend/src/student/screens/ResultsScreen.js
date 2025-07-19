import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import api from '../services/api';
import { ProgressChart } from 'react-native-chart-kit';

export default function ResultsScreen({ navigation, route }) {
  const { sessionId } = route.params;
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

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
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Your GD Results</Text>
      
      {results.qualified ? (
        <Text style={styles.successText}>Congratulations! You qualified for Level {results.nextLevel}</Text>
      ) : (
        <Text style={styles.failureText}>Keep practicing! You did not qualify this time</Text>
      )}

      <ProgressChart
        data={{
          labels: ["Leadership", "Communication", "Teamwork"],
          data: [results.scores.leadership / 5, results.scores.communication / 5, results.scores.teamwork / 5]
        }}
        width={300}
        height={220}
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(46, 134, 222, ${opacity})`,
        }}
        style={styles.chart}
      />

      <View style={styles.feedbackSection}>
        <Text style={styles.sectionTitle}>Faculty Feedback</Text>
        <Text style={styles.feedbackText}>{results.feedback || "No feedback provided"}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Scores</Text>
        <View style={styles.scoreRow}>
          <Text>Leadership:</Text>
          <Text>{results.scores.leadership}/5</Text>
        </View>
        <View style={styles.scoreRow}>
          <Text>Communication:</Text>
          <Text>{results.scores.communication}/5</Text>
        </View>
        <View style={styles.scoreRow}>
          <Text>Teamwork:</Text>
          <Text>{results.scores.teamwork}/5</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  successText: {
    color: 'green',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  failureText: {
    color: 'red',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  chart: {
    marginVertical: 20,
    alignSelf: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  feedbackSection: {
    marginBottom: 30,
  },
  feedbackText: {
    fontStyle: 'italic',
    lineHeight: 22,
  },
});