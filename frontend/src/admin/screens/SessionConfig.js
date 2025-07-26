// frontend/src/admin/screens/SessionConfig.js
import React, { useState, useEffect } from 'react';
import { View, Button, Alert, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AgendaEditor from '../components/AgendaEditor';
import api from '../services/api';

export default function SessionConfig() {
  const [level, setLevel] = useState(1);
  const [agenda, setAgenda] = useState({
    prep_time: 0,
    discussion: 0,
    survey: 0
  });
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(60); // Default 60 minutes
  const [startTime, setStartTime] = useState(new Date());

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const response = await api.admin.getVenues();
        setVenues(response.data);
        if (response.data.length > 0) {
          setSelectedVenue(response.data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch venues:', error);
      }
    };
    fetchVenues();
  }, []);

  const calculateEndTime = (start, duration) => {
    const endTime = new Date(start);
    endTime.setMinutes(endTime.getMinutes() + duration);
    return endTime;
  };

  const handleSaveSession = async () => {
    setIsLoading(true);
    try {
      const endTime = calculateEndTime(startTime, sessionDuration);
      
      const sessionData = {
        venue_id: selectedVenue,
        level: level,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        agenda: agenda,
        survey_weights: {
          participation: 0.4,
          knowledge: 0.3,
          communication: 0.3
        }
      };

      const response = await api.admin.createBulkSessions({
        sessions: [sessionData]
      });

      if (response.status === 200) {
        Alert.alert('Success', 'Session created successfully');
      } else {
        throw new Error(response.data?.error || 'Failed to create session');
      }
    } catch (error) {
      console.error("Session creation error:", error);
      Alert.alert('Error', error.message || 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Picker
        selectedValue={selectedVenue}
        onValueChange={setSelectedVenue}
        style={{ marginBottom: 20 }}
      >
        {venues.map(venue => (
          <Picker.Item 
            key={venue.id} 
            label={venue.name} 
            value={venue.id} 
          />
        ))}
      </Picker>
      
      <Picker
        selectedValue={level}
        onValueChange={setLevel}
        style={{ marginBottom: 20 }}
      >
        <Picker.Item label="Level 1" value={1} />
        <Picker.Item label="Level 2" value={2} />
      </Picker>
      
      <TextInput
        placeholder="Session Duration (minutes)"
        value={sessionDuration.toString()}
        onChangeText={(text) => setSessionDuration(parseInt(text) || 0)}
        keyboardType="numeric"
        style={{ marginBottom: 20 }}
      />
      
      <AgendaEditor agenda={agenda} onChange={setAgenda} />
      
      <Button
        title={isLoading ? "Saving..." : "Save Session"}
        onPress={handleSaveSession}
        disabled={isLoading || !selectedVenue}
      />
    </View>
  );
}