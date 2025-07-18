// In VenueSetup.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import api from '../services/api';
import HeaderWithMenu from '../components/HeaderWithMenu';
export default function VenueSetup({ route, navigation }) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [venueId, setVenueId] = useState(null);

  useEffect(() => {
    if (route.params?.venue) {
      const { venue } = route.params;
      setName(venue.name);
      setCapacity(venue.capacity.toString());
      setVenueId(venue.id);
      setIsEditing(true);
    }
  }, [route.params?.venue]);

const handleSubmit = async () => {
  const venueData = {
    name,
    capacity: parseInt(capacity),
    id: isEditing ? venueId : undefined,
  };

  try {
    if (isEditing) {
      await api.put(`/admin/venues`, venueData); 
    } else {
      await api.post('/admin/venues', venueData);
    }
    navigation.goBack();
  } catch (error) {
    console.error('Error saving venue:', error);
    Alert.alert(
      'Error',
      error.response?.data?.error || 'Failed to save venue'
    );
  }
};

  return (
    <View style={styles.container}>
      <HeaderWithMenu />
      <Text style={styles.title}>
        {isEditing ? 'Edit Venue' : 'Create New Venue'}
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Venue Name"
        value={name}
        onChangeText={setName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Capacity"
        keyboardType="numeric"
        value={capacity}
        onChangeText={setCapacity}
      />
      
      <Button
        title={isEditing ? 'Update Venue' : 'Create Venue'}
        onPress={handleSubmit}
      />
    </View>
  );
}

// Keep your existing styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
});