import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import api from '../services/api';
import { Picker } from '@react-native-picker/picker';
export default function TopParticipantsScreen() {
  const [loading, setLoading] = useState(true);
  const [topParticipants, setTopParticipants] = useState([]);
  const [error, setError] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [levels, setLevels] = useState([1, 2, 3, 4, 5]);

  useEffect(() => {
    const fetchTopParticipants = async () => {
      try {
        setLoading(true);
        const params = {};
        if (selectedLevel !== 'all') {
          params.level = selectedLevel;
        }
        
        const response = await api.admin.getTopParticipants(params);
        
        if (response.data?.error) {
          throw new Error(response.data.error);
        }

        setTopParticipants(response.data?.top_participants || []);
        setError(null);
      } catch (err) {
        console.error('Failed to load top participants:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchTopParticipants();
  }, [selectedLevel]);

  const renderItem = ({ item, index }) => (
    <View style={[
      styles.participantCard,
      index === 0 && styles.firstPlace,
      index === 1 && styles.secondPlace,
      index === 2 && styles.thirdPlace,
    ]}>
      <Text style={styles.rank}>#{index + 1}</Text>
      <View style={styles.participantInfo}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.details}>
          Level: {item.level} | Sessions: {item.session_count}
        </Text>
        <Text style={styles.score}>Total Score: {item.total_score.toFixed(1)}</Text>
        <Text style={styles.score}>Avg Score: {item.avg_score.toFixed(1)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Top Performers</Text>
      
      <View style={styles.filterContainer}>
  <Text style={styles.filterLabel}>Filter by Level:</Text>
  <Picker
    selectedValue={selectedLevel}
    style={styles.picker}
    onValueChange={(itemValue) => setSelectedLevel(itemValue)}
    mode="dropdown" // Optional: for Android dropdown style
  >
    <Picker.Item label="All Levels" value="all" />
    {levels.map(level => (
      <Picker.Item key={level} label={`Level ${level}`} value={level} />
    ))}
  </Picker>
</View>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : topParticipants.length === 0 ? (
        <Text style={styles.emptyText}>No participants found</Text>
      ) : (
        <FlatList
          data={topParticipants}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
  },
  filterLabel: {
    marginRight: 10,
    fontSize: 16,
  },
  picker: {
    flex: 1,
    height: 50,
  },
  listContent: {
    paddingBottom: 16,
  },
  participantCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 16,
    color: '#333',
    width: 40,
    textAlign: 'center',
  },
  participantInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  score: {
    fontSize: 14,
    color: '#444',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  loader: {
    marginTop: 20,
  },
});