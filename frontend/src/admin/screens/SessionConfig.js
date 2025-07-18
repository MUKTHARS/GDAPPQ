import React, { useState, useEffect } from 'react';
import { View, Button, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AgendaEditor from '../components/AgendaEditor';
import api from '../services/api';
import HeaderWithMenu from '../components/HeaderWithMenu';
export default function SessionConfig() {
  const [level, setLevel] = useState(1);
  const [agenda, setAgenda] = useState({
    prep_time: 5,
    discussion: 20,
    survey: 5
  });
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const response = await api.get('/admin/venues');
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

  const handleSaveSession = async () => {
    setIsLoading(true);
    try {
      await api.post('/admin/sessions/bulk', {
        sessions: [{
          venue_id: selectedVenue,
          level,
          start_time: new Date().toISOString(),
          agenda,
          survey_weights: {
            participation: 0.4,
            knowledge: 0.3,
            communication: 0.3
          }
        }]
      });
      Alert.alert('Success', 'Session created successfully');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <HeaderWithMenu />
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
      
      <AgendaEditor agenda={agenda} onChange={setAgenda} />
      
      <Button
        title={isLoading ? "Saving..." : "Save Session"}
        onPress={handleSaveSession}
        disabled={isLoading || !selectedVenue}
      />
    </View>
  );
}

