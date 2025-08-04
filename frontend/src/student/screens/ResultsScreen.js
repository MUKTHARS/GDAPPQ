import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, ActivityIndicator } from 'react-native';
import api from '../services/api';

export default function ResultsScreen({ navigation, route }) {
  const { sessionId } = route.params;
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const response = await api.student.getResults(sessionId);
        
        // Handle case where backend returns empty arrays
        const hasResults = response.data?.results?.length > 0;
        const hasParticipants = response.data?.participants?.length > 0;
        
        setResults(hasResults ? response.data.results : []);
        setParticipants(hasParticipants ? response.data.participants : []);
      } catch (error) {
        console.error("Failed to load results:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResults();
  }, [sessionId]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
        <Text>Calculating results...</Text>
      </View>
    );
  }

  // Show whatever results we have, even if incomplete
  const hasResults = results.length > 0;
  const hasParticipants = participants.length > 0;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Session Results</Text>
      
      {hasResults ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rankings</Text>
            {results.map((participant, index) => (
              <View 
                key={`result-${participant.responder_id || index}`}
                style={[
                  styles.resultCard,
                  index === 0 && styles.firstPlace,
                  index === 1 && styles.secondPlace,
                  index === 2 && styles.thirdPlace,
                ]}
              >
                <Text style={styles.rank}>
                  {index + 1}
                </Text>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{participant.name}</Text>
                  <Text style={styles.score}>Score: {participant.total_score.toFixed(1)}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Participants</Text>
            {participants.map(participant => (
              <View key={`participant-${participant.id}`} style={styles.participantCard}>
                <Text style={styles.participantName}>{participant.name}</Text>
              </View>
            ))}
          </View>
        </>
      ) : hasParticipants ? (
        <View style={styles.section}>
          <Text style={styles.message}>Results are being calculated...</Text>
          <Text style={styles.sectionTitle}>Participants</Text>
          {participants.map(participant => (
            <View key={`participant-${participant.id}`} style={styles.participantCard}>
              <Text style={styles.participantName}>{participant.name}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.message}>No participants found for this session</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
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
    color: '#333',
  },
  section: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  firstPlace: {
    borderLeftWidth: 5,
    borderLeftColor: '#FFD700',
  },
  secondPlace: {
    borderLeftWidth: 5,
    borderLeftColor: '#C0C0C0',
  },
  thirdPlace: {
    borderLeftWidth: 5,
    borderLeftColor: '#CD7F32',
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    width: 30,
    textAlign: 'center',
    marginRight: 10,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
  },
  score: {
    fontSize: 14,
    color: '#666',
  },
  participantCard: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  message: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 10,
  },
});