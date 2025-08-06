import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import api from '../services/api';
import { colors } from '../../student/assets/globalStyles';


export default function TopParticipantsScreen() {
  const [loading, setLoading] = useState(true);
  const [topParticipants, setTopParticipants] = useState([]);
  const [error, setError] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const levels = ['all', 1, 2, 3]; // Available level options

  useEffect(() => {
    const fetchTopParticipants = async () => {
      try {
        setLoading(true);
        const params = selectedLevel !== 'all' ? { level: selectedLevel } : {};
        
        console.log('Fetching participants with level:', selectedLevel);
        const response = await api.admin.getTopParticipants(params);
        
        if (response.data?.error) {
          throw new Error(response.data.error);
        }

        setTopParticipants(response.data?.top_participants || []);
        setError(null);
      } catch (err) {
        console.error('Failed to load top participants:', err);
        setError(err.message || 'Failed to load data');
        setTopParticipants([]);
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
      
      {/* Level Selector */}
      <View style={styles.levelSelector}>
        {levels.map(level => (
          <TouchableOpacity
            key={level}
            style={[
              styles.levelButton,
              selectedLevel === level && styles.selectedLevelButton
            ]}
            onPress={() => setSelectedLevel(level)}
          >
            <Text style={[
              styles.levelButtonText,
              selectedLevel === level && styles.selectedLevelButtonText
            ]}>
              {level === 'all' ? 'All Levels' : `Level ${level}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Current Filter Display */}
      <Text style={styles.filterText}>
        Showing: {selectedLevel === 'all' ? 'All Levels' : `Level ${selectedLevel}`}
      </Text>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : topParticipants.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No participants found {selectedLevel !== 'all' ? `for Level ${selectedLevel}` : ''}
          </Text>
          <Text style={styles.emptySubtext}>
            Participants will appear after completing GD sessions
          </Text>
        </View>
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
    color: colors.primary,
  },
  levelSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  levelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  selectedLevelButton: {
    backgroundColor: colors.primary,
  },
  levelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  selectedLevelButtonText: {
    color: 'white',
  },
  filterText: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
    fontStyle: 'italic',
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
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 16,
    width: 30,
    textAlign: 'center',
    color: colors.primary,
  },
  participantInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  details: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  score: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  loader: {
    marginTop: 40,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    color: '#999',
  },
  listContent: {
    paddingBottom: 20,
  },
});