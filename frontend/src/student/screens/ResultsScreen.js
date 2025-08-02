import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, ActivityIndicator } from 'react-native';
import api from '../services/api';

export default function ResultsScreen({ navigation, route }) {
  const { sessionId } = route.params;
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topPerformers, setTopPerformers] = useState([]);
  const [allParticipants, setAllParticipants] = useState([]);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const response = await api.student.getResults(sessionId);
        
        if (!response.data) {
          throw new Error("No data received");
        }
        
        // Filter out any participants not in this session
        const validParticipantIds = new Set(
          (response.data.participants || []).map(p => p.id)
        );
        
        const filteredResults = (response.data.results || []).filter(result => 
          validParticipantIds.has(result.responder_id)
        );
        
        setResults(filteredResults);
        setAllParticipants(response.data.participants || []);
        
        // Calculate top 3 performers from filtered results
        if (filteredResults.length > 0) {
          const sorted = [...filteredResults].sort((a, b) => b.total_score - a.total_score);
          setTopPerformers(sorted.slice(0, 3));
        }
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
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!results || results.length === 0) {
    return (
      <View style={styles.container}>
        <Text>No results available yet</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Session Results</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Performers</Text>
        
        {topPerformers.length > 0 ? (
          <View style={styles.topPerformersContainer}>
            {topPerformers.map((participant, index) => (
              <View 
                key={`top-${participant.responder_id || index}`} 
                style={[
                  styles.topPerformerCard,
                  index === 0 && styles.firstPlace,
                  index === 1 && styles.secondPlace,
                  index === 2 && styles.thirdPlace,
                ]}
              >
                <Text style={styles.rankBadge}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} {index + 1}
                </Text>
                <Text style={styles.topPerformerName}>{participant.name}</Text>
                <Text style={styles.topPerformerScore}>
                  Score: {participant.total_score.toFixed(1)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noResults}>No top performers data available</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Participants</Text>
        
        <FlatList
          data={allParticipants}
          keyExtractor={item => `participant-${item.id}`}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.participantCard}>
              <Text style={styles.participantName}>{item.name}</Text>
            </View>
          )}
        />
      </View>
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
    marginBottom: 25,
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
    fontWeight: '600',
    marginBottom: 15,
    color: '#444',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  topPerformersContainer: {
    marginTop: 10,
  },
  topPerformerCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  firstPlace: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  secondPlace: {
    borderLeftWidth: 4,
    borderLeftColor: '#C0C0C0',
  },
  thirdPlace: {
    borderLeftWidth: 4,
    borderLeftColor: '#CD7F32',
  },
  rankBadge: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 50,
  },
  topPerformerName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    color: '#333',
  },
  topPerformerScore: {
    fontSize: 14,
    color: '#666',
  },
  participantCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  noResults: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 15,
  },
});