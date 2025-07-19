import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, TouchableOpacity } from 'react-native';
import api from '../services/api';
import { globalStyles, colors } from '../assets/globalStyles';
export default function SessionBooking() {
  const [sessions, setSessions] = useState([]);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await api.student.getSessions(level);
        setSessions(response.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchSessions();
  }, [level]);

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Available Sessions (Level {level})</Text>
      
      {/* Level selector */}
      <View style={[globalStyles.row, globalStyles.spaceBetween, { marginBottom: 20 }]}>
        {[1, 2, 3].map((lvl) => (
          <TouchableOpacity
            key={lvl}
            style={[
              globalStyles.button,
              level === lvl ? globalStyles.primaryButton : globalStyles.secondaryButton,
              { width: '30%' }
            ]}
            onPress={() => setLevel(lvl)}
          >
            <Text style={level === lvl ? globalStyles.buttonText : globalStyles.secondaryButtonText}>
              Level {lvl}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={sessions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={globalStyles.card}>
            <Text style={globalStyles.subtitle}>{item.venue}</Text>
            <Text style={globalStyles.bodyText}>
              {new Date(item.start_time).toLocaleString()}
            </Text>
            <Text style={globalStyles.bodyText}>
              Duration: {item.duration} minutes
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={globalStyles.bodyText}>No sessions available</Text>
        }
      />
    </View>
  );
}