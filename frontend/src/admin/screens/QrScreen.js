import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Button } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import QRCode from 'react-native-qrcode-svg';
import api from '../services/api';

export default function QrScreen({ route, navigation }) {
  const [qrData, setQrData] = useState(null);
  const [expiryTime, setExpiryTime] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { venue } = route.params;
if (!route.params?.venue?.id) {
  return (
    <View style={styles.container}>
      <Text style={styles.error}>Error: Invalid venue data</Text>
      <Button 
        title="Go Back" 
        onPress={() => navigation.goBack()} 
      />
    </View>
  );
}
  const fetchQR = async () => {
  try {
    setIsLoading(true);
    setError(null);
    
    // Add validation for venue ID
    if (!venue?.id || typeof venue.id !== 'string' || venue.id.trim() === '') {
      throw new Error('Invalid venue information');
    }

    const response = await api.get('/admin/qr', {
      params: { venue_id: venue.id.toString() },
      timeout: 15000
    });
    
    if (response.data?.qr_string) {
      setQrData(response.data.qr_string);
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 15);
      setExpiryTime(expiry.toLocaleTimeString());
      setRetryCount(0); // Reset retry count on success
    } else {
      throw new Error(response.data?.error || 'Invalid QR data received');
    }
  } catch (error) {
    console.error('QR Generation Error:', error.message);
    setError(error.message);
    
    // Only retry if it's a network error and we haven't exceeded max retries
    if (retryCount < 3 && error.message !== 'Invalid venue information') {
      const delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
      setTimeout(() => {
        setRetryCount(c => c + 1);
        fetchQR();
      }, delay);
    }
  } finally {
    setIsLoading(false);
  }
};

  useEffect(() => {
    fetchQR();
    return () => {
      // Cleanup any pending retries
      setRetryCount(0);
    };
  }, [venue?.id]);

  return (
    <View style={styles.container}>
      <Text style={styles.venueName}>{venue.name}</Text>
      <Text style={styles.capacity}>Capacity: {venue.capacity}</Text>
      
      {isLoading ? (
        <Text>Loading QR code...</Text>
      ) : error ? (
        <Text style={styles.error}>Error: {error}</Text>
      ) : qrData ? (
        <>
          <View style={styles.qrContainer}>
            <QRCode
              value={qrData}
              size={250}
              color="black"
              backgroundColor="white"
            />
          </View>
          <Text style={styles.expiry}>Valid until: {expiryTime}</Text>
        </>
      ) : (
        <Text>No QR data available</Text>
      )}

      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={fetchQR}
      >
        <Icon name="refresh" size={24} color="#2e86de" />
        <Text style={styles.refreshText}>Generate New QR</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  venueName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  capacity: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  qrContainer: {
    marginVertical: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  expiry: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  refreshText: {
    marginLeft: 10,
    color: '#2e86de',
  },
  error: {
    color: 'red',
    marginVertical: 20,
  }
});