import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import api from '../services/api';
import auth from '../services/auth'; 
import { globalStyles, colors } from '../assets/globalStyles';
import { useNavigation } from '@react-navigation/native';

export default function SessionBooking() {
  const [venues, setVenues] = useState([]);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [cancelText, setCancelText] = useState('');
  const [isBooked, setIsBooked] = useState(false);
  const [bookedVenues, setBookedVenues] = useState([]);
  const navigation = useNavigation();

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
        // Check booking status for each venue
        const booked = [];
        for (const venue of response.data) {
          try {
            const bookingResponse = await api.student.checkBooking(venue.id);
            if (bookingResponse.data.is_booked) {
              booked.push(venue.id);
            }
          } catch (error) {
            console.error('Error checking booking for venue:', venue.id, error);
          }
        }
        setBookedVenues(booked);
      }
    } catch (error) {
      console.error('Venues fetch error:', error);
      setError(error.response?.data?.error || error.message || 'Failed to load venues');
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  const openVenueDetails = (venue) => {
    setSelectedVenue(venue);
    checkIfBooked(venue.id);
    setIsModalVisible(true);
  };

  const checkIfBooked = async (venueId) => {
    try {
      const authData = await auth.getAuthData();
      const response = await api.student.checkBooking(venueId);
      setIsBooked(response.data.is_booked);
    } catch (error) {
      console.error('Check booking error:', error);
      setIsBooked(false);
    }
  };

  const handleBookVenue = async () => {
    try {
      setLoading(true);
      const authData = await auth.getAuthData();
      const studentLevel = parseInt(authData.level || 1);
      
      if (studentLevel !== selectedVenue.level) {
        Alert.alert(
          'Booking Failed',
          `You can only book venues for your current level (Level ${studentLevel})`
        );
        return;
      }
      
      const response = await api.student.bookVenue(selectedVenue.id);
      
      setBookedVenues([...bookedVenues, selectedVenue.id]);
      Alert.alert(
        'Booking Successful',
        `You have successfully booked ${selectedVenue.venue_name}`,
        [{ text: 'OK', onPress: () => {
          fetchVenues(level);
          setIsModalVisible(false);
        }}]
      );
    } catch (error) {
      let errorMessage = 'Failed to book venue';
      if (error.response?.status === 409) {
        errorMessage = 'You have already booked this venue';
      } else if (error.response?.status === 403) {
        errorMessage = 'You can only have one active booking at a time';
      }
      Alert.alert('Booking Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (cancelText.toLowerCase() !== 'cancel') {
      Alert.alert('Invalid Input', 'Please type "cancel" to confirm');
      return;
    }

    try {
      setLoading(true);
      const response = await api.student.cancelBooking(selectedVenue.id);
      
      setBookedVenues(bookedVenues.filter(id => id !== selectedVenue.id));
      Alert.alert(
        'Booking Cancelled',
        `Your booking for ${selectedVenue.venue_name} has been cancelled`,
        [{ text: 'OK', onPress: () => {
          fetchVenues(level);
          setIsModalVisible(false);
          setCancelText('');
        }}]
      );
    } catch (error) {
      Alert.alert('Cancellation Failed', 'Failed to cancel booking. Please try again.');
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

  const renderVenueItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.venueCard}
      onPress={() => openVenueDetails(item)}
      disabled={loading}
    >
      <Text style={styles.venueName}>{item.venue_name}</Text>
      <Text style={styles.detailText}>Timing: {item.session_timing || 'Not specified'}</Text>
      <Text style={styles.detailText}>Capacity: {item.capacity}</Text>
      <Text style={styles.detailText}>Remaining: {item.remaining}</Text>
      {bookedVenues.includes(item.id) && (
        <View style={styles.bookedTag}>
          <Text style={styles.bookedTagText}>Booked</Text>
        </View>
      )}
    </TouchableOpacity>
  );

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
          renderItem={renderVenueItem}
        />
      )}

      {/* Venue Details Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedVenue && (
              <>
                <Text style={styles.modalTitle}>{selectedVenue.venue_name}</Text>
                <Text style={styles.modalText}>Timing: {selectedVenue.session_timing}</Text>
                <Text style={styles.modalText}>Table: {selectedVenue.table_details}</Text>
                <Text style={styles.modalText}>Capacity: {selectedVenue.capacity}</Text>
                <Text style={styles.modalText}>Available: {selectedVenue.remaining}</Text>
                
                {isBooked ? (
                  <>
                    <Text style={styles.bookedText}>You have booked this venue</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Type 'cancel' to confirm"
                      value={cancelText}
                      onChangeText={setCancelText}
                    />
                    <TouchableOpacity
                      style={[
                        globalStyles.button,
                        styles.cancelButton,
                        cancelText.toLowerCase() === 'cancel' && { backgroundColor: "green"}
                      ]}
                      onPress={() => {
                        if (cancelText.toLowerCase() === 'cancel') {
                          Alert.alert(
                            'Confirm Cancellation',
                            'Are you sure you want to cancel this booking?',
                            [
                              {
                                text: 'No',
                                style: 'cancel',
                              },
                              {
                                text: 'Yes',
                                onPress: handleCancelBooking,
                              },
                            ]
                          );
                        }
                      }}
                      disabled={loading || cancelText.toLowerCase() !== 'cancel'}
                    >
                      <Text style={globalStyles.buttonText}>Cancel Booking</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[globalStyles.button, styles.bookButton]}
                    onPress={handleBookVenue}
                    disabled={loading || selectedVenue.remaining <= 0}
                  >
                    <Text style={globalStyles.buttonText}>
                      {selectedVenue.remaining <= 0 ? 'Fully Booked' : 'Book Now'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setIsModalVisible(false);
                setCancelText('');
              }}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: colors.primary,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 10,
  },
  bookedText: {
    fontSize: 16,
    color: colors.success,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginVertical: 10,
  },
  bookButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
  },
  cancelButton: {
    marginTop: 10,
    backgroundColor: '#ccc',
  },
  closeButton: {
    marginTop: 15,
    alignSelf: 'center',
  },
  closeButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  bookedTag: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bookedTagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
