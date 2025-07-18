import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Button, Modal,Animated, TextInput, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import QRCode from 'react-native-qrcode-svg';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
export default function Dashboard({ navigation }) {
  const [venues, setVenues] = useState([]);
  const [editingVenue, setEditingVenue] = useState(null);
  const [venueName, setVenueName] = useState('');
  const [venueCapacity, setVenueCapacity] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentQR, setCurrentQR] = useState(null);
  const [expiryTime, setExpiryTime] = useState('');
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-250));
const isFocused = useIsFocused();
const toggleSideMenu = () => {
  if (showSideMenu) {
    Animated.timing(slideAnim, {
      toValue: -250,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowSideMenu(false));
  } else {
    setShowSideMenu(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }
};

const menuItems = [
  { title: 'Dashboard', screen: 'Dashboard' },
  { title: 'Venue Management', screen: 'VenueSetup' },
   { title: 'Session Config', screen: 'SessionConfig' },
   { title: 'Session Rules', screen: 'SessionRules' },
    { title: 'Session Calendar', screen: 'SessionCalendar' },
    { title: 'Student Progress', screen: 'StudentProgress' },
    { title: 'Question Bank', screen: 'QuestionBank' },
    { title: 'Analytics', screen: 'Analytics' },
    { title: 'Bulk Sesison', screen: 'Bulk Session' },
  ];

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const response = await api.get('/admin/venues');
        if (response.data && Array.isArray(response.data)) {
          setVenues(response.data);
        } else {
          console.error('Invalid venues data:', response.data);
          setVenues([]);
        }
      } catch (error) {
        console.error('Error fetching venues:', error);
        setVenues([]);
      }
    };

    if (isFocused) {
      fetchVenues();
    }
  }, [isFocused]); 

const handleGenerateQR = async (venueId) => {
  try {
    const response = await api.get('/admin/qr', {
      params: { venue_id: venueId },
      timeout: 15000
    });
    
    if (response.data?.qr_string) {
      setCurrentQR(response.data.qr_string);
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 15);
      setExpiryTime(expiry.toLocaleTimeString());
      setShowQRModal(true);
    } else {
      throw new Error(response.data?.error || 'Invalid QR data');
    }
  } catch (error) {
    console.error('QR Generation Error:', error.message);
    Alert.alert('Error', 'Failed to generate QR code. Please try again.');
  }
};

  const handleUpdateVenue = async () => {
    try {
      const updatedVenue = {
        name: venueName,
        capacity: parseInt(venueCapacity),
      };
      
      await api.put(`/admin/venues/${editingVenue.id}`, updatedVenue, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`
        }
      });
      
      // Refresh the venues list
      const response = await api.get('/admin/venues');
      setVenues(response.data);
      
      // Close the modal
      setEditingVenue(null);
    } catch (error) {
      console.error('Error updating venue:', error);
    }
};
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
  <TouchableOpacity onPress={toggleSideMenu} style={styles.hamburgerButton}>
    <View style={styles.hamburgerLine} />
    <View style={styles.hamburgerLine} />
    <View style={styles.hamburgerLine} />
  </TouchableOpacity>
  {/* Side Menu */}
{showSideMenu && (
  <Modal
    visible={showSideMenu}
    transparent={true}
    animationType="none"
    onRequestClose={() => setShowSideMenu(false)}
  >
    <TouchableOpacity 
      style={styles.overlay} 
      activeOpacity={1} 
      onPress={() => toggleSideMenu()}
    >
      <Animated.View 
        style={[
          styles.sideMenu,
          {
            transform: [{ translateX: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity activeOpacity={1}>
          <Text style={styles.menuHeader}>Menu</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => {
                navigation.navigate(item.screen);
                toggleSideMenu();
              }}
            >
              <Text style={styles.menuItemText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
  </Modal>
)}
</View>
      <Text style={styles.title}>GD Session Manager</Text>
      <Text style={styles.sectionTitle}>Your Venues</Text>

      {/* Edit Venue Modal */}
      <Modal
        visible={!!editingVenue}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingVenue(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Venue</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Venue Name"
              value={venueName}
              onChangeText={setVenueName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Capacity"
              value={venueCapacity}
              onChangeText={setVenueCapacity}
              keyboardType="numeric"
            />
            
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setEditingVenue(null)} />
              <Button title="Save" onPress={handleUpdateVenue} />
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Venue QR Code</Text>
            
            {currentQR ? (
              <>
                <View style={styles.qrContainer}>
                  <QRCode
                    value={currentQR}
                    size={200}
                    color="black"
                    backgroundColor="white"
                  />
                </View>
                <Text style={styles.expiryText}>Valid until: {expiryTime}</Text>
              </>
            ) : (
              <Text>Generating QR code...</Text>
            )}
            
            <View style={styles.modalButtons}>
              <Button title="Close" onPress={() => setShowQRModal(false)} />
            </View>
          </View>
        </View>
      </Modal>

      {venues.map(venue => (
  <View key={venue.id} style={styles.venueCard}>
    <View style={styles.venueInfo}>
      <Text style={styles.venueName}>{venue.name}</Text>
      <Text>Capacity: {venue.capacity}</Text>
    </View>
    
    <View style={styles.venueActions}>
      <TouchableOpacity 
        onPress={() => {
          setEditingVenue(venue);
          setVenueName(venue.name);
          setVenueCapacity(venue.capacity.toString());
        }}
      >
        <Icon name="edit" size={24} color="#555" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => navigation.navigate('QrScreen', { venue })}
        style={styles.qrButton}
      >
        <Icon name="qr-code-2" size={24} color="#2e86de" />
      </TouchableOpacity>
    </View>
  </View>
))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10
  },
  button: {
    marginVertical: 10
  },
  venueCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  venueActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrButton: {
    marginLeft: 15,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    width: '100%',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 15,
  },
  qrContainer: {
    marginVertical: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  expiryText: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
  },
 
 header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#2e86de',
    marginBottom: 20,
  },
  hamburgerButton: {
    padding: 10,
  },
  hamburgerLine: {
    width: 25,
    height: 3,
    backgroundColor: 'white',
    marginVertical: 2,
    borderRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 15,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sideMenu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: 'white',
    paddingTop: 50,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#2e86de',
  },
  menuItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
});