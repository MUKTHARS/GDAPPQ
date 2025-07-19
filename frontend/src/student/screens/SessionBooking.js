import React, { useState, useEffect } from 'react';
import { View, FlatList, Text } from 'react-native';
import api from '../services/api';

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
    <View>
      <Text>Available Sessions (Level {level})</Text>
      <FlatList
        data={sessions}
        renderItem={({item}) => (
          <View>
            <Text>{item.venue} at {new Date(item.start_time).toLocaleString()}</Text>
          </View>
        )}
      />
    </View>
  );
}