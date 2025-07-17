import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import api from '../services/api';

export default function QrGenerator({ route }) {
  const [qrCode, setQrCode] = useState(null);
  const { venueId } = route.params;

  useEffect(() => {
    const fetchQR = async () => {
      try {
        const response = await api.get(`/qr?venue_id=${venueId}`);
        setQrCode(response.data); // Assuming API returns base64 image
      } catch (error) {
        console.error('Failed to generate QR:', error);
      }
    };
    
    fetchQR();
  }, [venueId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Venue QR Code</Text>
      <Text style={styles.subtitle}>Scan this at the physical location</Text>
      
      {qrCode ? (
        <Image 
          source={{ uri: `data:image/png;base64,${qrCode}` }} 
          style={styles.qrImage}
        />
      ) : (
        <Text>Generating QR code...</Text>
      )}
      
      <Text style={styles.note}>
        This code will expire 5 minutes after session start time
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5
  },
  subtitle: {
    color: '#666',
    marginBottom: 20
  },
  qrImage: {
    width: 250,
    height: 250,
    marginVertical: 20
  },
  note: {
    marginTop: 20,
    fontStyle: 'italic',
    color: '#888'
  }
});