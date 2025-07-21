import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../services/api';
import auth from '../services/auth'; 
import { globalStyles, colors } from '../assets/globalStyles';

export default function SessionBooking() {
  const [venues, setVenues] = useState([]);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchVenues = async (lvl) => {
    try {
      setLoading(true);
      setError(null);
      
      const authData = await auth.getAuthData();
      if (!authData.token) {
        throw new Error('Authentication required');
      }

      const response = await api.student.getSessions(lvl);
      console.log('Venues API Response:', response.data);
      
      if (!response.data || response.data.length === 0) {
        setError(`No venues found for level ${lvl}.`);
      } else {
        setVenues(response.data);
      }
    } catch (error) {
      console.error('Venues fetch error:', error);
      setError(error.response?.data?.error || error.message || 'Failed to load venues');
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues(level);
  }, [level]);

  const handleLevelChange = (lvl) => {
    setLevel(lvl);
  };

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Available Venues (Level {level})</Text>
      
      <View style={[globalStyles.row, globalStyles.spaceBetween, { marginBottom: 20 }]}>
        {[1, 2, 3].map((lvl) => (
          <TouchableOpacity
            key={lvl}
            style={[
              globalStyles.button,
              level === lvl ? globalStyles.primaryButton : globalStyles.secondaryButton,
              { width: '30%' }
            ]}
            onPress={() => handleLevelChange(lvl)}
            disabled={loading}
          >
            <Text style={level === lvl ? globalStyles.buttonText : globalStyles.secondaryButtonText}>
              Level {lvl}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={[globalStyles.button, { marginTop: 10 }]}
            onPress={() => fetchVenues(level)}
          >
            <Text style={globalStyles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : venues.length === 0 ? (
        <Text style={styles.noVenuesText}>No venues available for this level</Text>
      ) : (
        <FlatList
          data={venues}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
    <View style={styles.venueCard}>
        <Text style={styles.venueName}>{item.venue_name}</Text>
        <Text style={styles.detailText}>Timing: {item.session_timing || 'Not specified'}</Text>
        <Text style={styles.detailText}>Table: {item.table_details || 'Not specified'}</Text>
        <Text style={styles.detailText}>Capacity: {item.capacity || 'N/A'}</Text>
    </View>
)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  venueCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  venueName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    marginBottom: 10,
  },
  noVenuesText: {
    textAlign: 'center',
    marginTop: 20,
    color: colors.textSecondary,
  },
});

