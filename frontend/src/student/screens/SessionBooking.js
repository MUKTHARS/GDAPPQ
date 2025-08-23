import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import api from '../services/api';
import auth from '../services/auth'; 
import { globalStyles, colors, layout } from '../assets/globalStyles';
import { useNavigation } from '@react-navigation/native';
import FloatingActionButton from '../components/FloatingActionButton';
import HamburgerHeader from '../components/HamburgerHeader';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

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

  const getAvailabilityColor = (remaining, capacity) => {
    const percentage = (remaining / capacity) * 100;
    if (percentage > 50) return '#4CAF50';
    if (percentage > 20) return '#FF9800';
    return '#F44336';
  };

  const renderVenueItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.venueCard}
      onPress={() => openVenueDetails(item)}
      disabled={loading}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={bookedVenues.includes(item.id) ? ['#667eea', '#764ba2'] : ['#f093fb', '#f5576c']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.gradientBackground}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.venueNameContainer}>
              <Icon name="place" size={20} color="#fff" style={styles.locationIcon} />
              <Text style={styles.venueName}>{item.venue_name}</Text>
            </View>
            {bookedVenues.includes(item.id) && (
              <View style={styles.bookedBadge}>
                <Icon name="check-circle" size={16} color="#fff" />
                <Text style={styles.bookedBadgeText}>Booked</Text>
              </View>
            )}
          </View>

          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Icon name="schedule" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.infoLabel}>Timing</Text>
                <Text style={styles.infoValue}>{item.session_timing || 'Not specified'}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Icon name="group" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.infoLabel}>Capacity</Text>
                <Text style={styles.infoValue}>{item.capacity}</Text>
              </View>
            </View>

            <View style={styles.availabilitySection}>
              <View style={styles.availabilityHeader}>
                <Text style={styles.availabilityLabel}>Available Spots</Text>
                <Text style={styles.availabilityNumber}>{item.remaining}</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${(item.remaining / item.capacity) * 100}%`,
                        backgroundColor: getAvailabilityColor(item.remaining, item.capacity)
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {Math.round((item.remaining / item.capacity) * 100)}%
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.statusIndicator}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: item.remaining > 0 ? '#4CAF50' : '#F44336' }
              ]} />
              <Text style={styles.statusText}>
                {item.remaining > 0 ? 'Available' : 'Full'}
              </Text>
            </View>
            <Icon name="keyboard-arrow-right" size={24} color="rgba(255,255,255,0.7)" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.headerGradient}
      >
        <HamburgerHeader title="Available Sessions" showMenu={false} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Find Your Perfect Session</Text>
          <Text style={styles.headerSubtitle}>Level {level} Venues</Text>
        </View>
      </LinearGradient>
      
      <View style={styles.content}>
        <View style={styles.levelSelector}>
          {[1, 2, 3].map((lvl) => (
            <TouchableOpacity
              key={lvl}
              style={[
                styles.levelButton,
                level === lvl && styles.levelButtonActive
              ]}
              onPress={() => handleLevelChange(lvl)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={level === lvl ? ['#667eea', '#764ba2'] : ['#f8f9fa', '#e9ecef']}
                style={styles.levelButtonGradient}
              >
                <Text style={[
                  styles.levelButtonText,
                  level === lvl && styles.levelButtonTextActive
                ]}>
                  Level {lvl}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading venues...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Icon name="error-outline" size={48} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchVenues(level)}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.retryButtonGradient}
              >
                <Icon name="refresh" size={20} color="#fff" />
                <Text style={styles.retryButtonText}>Retry</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : venues.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="event-busy" size={64} color={colors.gray[400]} />
            <Text style={styles.emptyTitle}>No Venues Available</Text>
            <Text style={styles.emptySubtitle}>Check back later for Level {level} venues</Text>
          </View>
        ) : (
          <FlatList
            data={venues}
            keyExtractor={item => item.id}
            renderItem={renderVenueItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}

        <FloatingActionButton 
          onPress={() => navigation.navigate('QrScanner')}
          iconName="qr-code-scanner"
        />
      </View>

      {/* Enhanced Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.modalGradient}
            >
              {selectedVenue && (
                <>
                  <View style={styles.modalHeader}>
                    <View>
                      <Text style={styles.modalTitle}>{selectedVenue.venue_name}</Text>
                      <Text style={styles.modalSubtitle}>Session Details</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => {
                        setIsModalVisible(false);
                        setCancelText('');
                      }}
                    >
                      <Icon name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalContent}>
                    <View style={styles.modalInfoGrid}>
                      <View style={styles.modalInfoItem}>
                        <Icon name="schedule" size={20} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.modalInfoLabel}>Timing</Text>
                        <Text style={styles.modalInfoValue}>{selectedVenue.session_timing}</Text>
                      </View>
                      
                      <View style={styles.modalInfoItem}>
                        <Icon name="table-restaurant" size={20} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.modalInfoLabel}>Table</Text>
                        <Text style={styles.modalInfoValue}>{selectedVenue.table_details}</Text>
                      </View>
                      
                      <View style={styles.modalInfoItem}>
                        <Icon name="group" size={20} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.modalInfoLabel}>Capacity</Text>
                        <Text style={styles.modalInfoValue}>{selectedVenue.capacity}</Text>
                      </View>
                      
                      <View style={styles.modalInfoItem}>
                        <Icon name="event-available" size={20} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.modalInfoLabel}>Available</Text>
                        <Text style={styles.modalInfoValue}>{selectedVenue.remaining}</Text>
                      </View>
                    </View>
                    
                    {isBooked ? (
                      <View style={styles.bookedSection}>
                        <View style={styles.bookedStatus}>
                          <Icon name="check-circle" size={24} color="#4CAF50" />
                          <Text style={styles.bookedStatusText}>You have booked this venue</Text>
                        </View>
                        
                        <TextInput
                          style={styles.cancelInput}
                          placeholder="Type 'cancel' to confirm cancellation"
                          placeholderTextColor="rgba(255,255,255,0.6)"
                          value={cancelText}
                          onChangeText={setCancelText}
                        />
                        
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            cancelText.toLowerCase() === 'cancel' && styles.actionButtonEnabled
                          ]}
                          onPress={() => {
                            if (cancelText.toLowerCase() === 'cancel') {
                              Alert.alert(
                                'Confirm Cancellation',
                                'Are you sure you want to cancel this booking?',
                                [
                                  { text: 'No', style: 'cancel' },
                                  { text: 'Yes', onPress: handleCancelBooking }
                                ]
                              );
                            }
                          }}
                          disabled={loading || cancelText.toLowerCase() !== 'cancel'}
                        >
                          <LinearGradient
                            colors={cancelText.toLowerCase() === 'cancel' ? ['#F44336', '#E53935'] : ['#9E9E9E', '#757575']}
                            style={styles.actionButtonGradient}
                          >
                            <Icon name="cancel" size={20} color="#fff" />
                            <Text style={styles.actionButtonText}>Cancel Booking</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          selectedVenue.remaining <= 0 && styles.actionButtonDisabled
                        ]}
                        onPress={handleBookVenue}
                        disabled={loading || selectedVenue.remaining <= 0}
                      >
                        <LinearGradient
                          colors={selectedVenue.remaining <= 0 ? ['#9E9E9E', '#757575'] : ['#4CAF50', '#43A047']}
                          style={styles.actionButtonGradient}
                        >
                          <Icon name={selectedVenue.remaining <= 0 ? "block" : "event-available"} size={20} color="#fff" />
                          <Text style={styles.actionButtonText}>
                            {selectedVenue.remaining <= 0 ? 'Fully Booked' : 'Book Now'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerGradient: {
    paddingBottom: 20,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  levelSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  levelButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  levelButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  levelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[600],
  },
  levelButtonTextActive: {
    color: '#fff',
  },
  venueCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradientBackground: {
    padding: 20,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  venueNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIcon: {
    marginRight: 8,
  },
  venueName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  bookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bookedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardBody: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  availabilitySection: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  availabilityLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  availabilityNumber: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    minWidth: 35,
    textAlign: 'right',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray[600],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    fontSize: 16,
    marginVertical: 16,
    lineHeight: 24,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[700],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.gray[500],
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalContent: {
    padding: 24,
  },
  modalInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  modalInfoItem: {
    width: '50%',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalInfoLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    marginBottom: 4,
  },
  modalInfoValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  bookedSection: {
    marginTop: 16,
  },
  bookedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 20,
  },
  bookedStatusText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontSize: 16,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonEnabled: {
    opacity: 1,
  },
});

// import React, { useState, useEffect } from 'react';
// import { View, FlatList, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
// import api from '../services/api';
// import auth from '../services/auth'; 
// import { globalStyles, colors, layout } from '../assets/globalStyles';
// import { useNavigation } from '@react-navigation/native';
// import FloatingActionButton from '../components/FloatingActionButton';
// import HamburgerHeader from '../components/HamburgerHeader';
// import Icon from 'react-native-vector-icons/MaterialIcons';

// export default function SessionBooking() {
//   const [venues, setVenues] = useState([]);
//   const [level, setLevel] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [selectedVenue, setSelectedVenue] = useState(null);
//   const [isModalVisible, setIsModalVisible] = useState(false);
//   const [cancelText, setCancelText] = useState('');
//   const [isBooked, setIsBooked] = useState(false);
//   const [bookedVenues, setBookedVenues] = useState([]);
//   const navigation = useNavigation();

//   const fetchVenues = async (lvl) => {
//     try {
//       setLoading(true);
//       setError(null);
      
//       const authData = await auth.getAuthData();
//       if (!authData.token) {
//         throw new Error('Authentication required');
//       }

//       const response = await api.student.getSessions(lvl);
//       console.log('Venues API Response:', response.data);
      
//       if (!response.data || response.data.length === 0) {
//         setError(`No venues found for level ${lvl}.`);
//       } else {
//         setVenues(response.data);
//         // Check booking status for each venue
//         const booked = [];
//         for (const venue of response.data) {
//           try {
//             const bookingResponse = await api.student.checkBooking(venue.id);
//             if (bookingResponse.data.is_booked) {
//               booked.push(venue.id);
//             }
//           } catch (error) {
//             console.error('Error checking booking for venue:', venue.id, error);
//           }
//         }
//         setBookedVenues(booked);
//       }
//     } catch (error) {
//       console.error('Venues fetch error:', error);
//       setError(error.response?.data?.error || error.message || 'Failed to load venues');
//       setVenues([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const openVenueDetails = (venue) => {
//     setSelectedVenue(venue);
//     checkIfBooked(venue.id);
//     setIsModalVisible(true);
//   };

//   const checkIfBooked = async (venueId) => {
//     try {
//       const authData = await auth.getAuthData();
//       const response = await api.student.checkBooking(venueId);
//       setIsBooked(response.data.is_booked);
//     } catch (error) {
//       console.error('Check booking error:', error);
//       setIsBooked(false);
//     }
//   };

//   const handleBookVenue = async () => {
//     try {
//       setLoading(true);
//       const authData = await auth.getAuthData();
//       const studentLevel = parseInt(authData.level || 1);
      
//       if (studentLevel !== selectedVenue.level) {
//         Alert.alert(
//           'Booking Failed',
//           `You can only book venues for your current level (Level ${studentLevel})`
//         );
//         return;
//       }
      
//       const response = await api.student.bookVenue(selectedVenue.id);
      
//       setBookedVenues([...bookedVenues, selectedVenue.id]);
//       Alert.alert(
//         'Booking Successful',
//         `You have successfully booked ${selectedVenue.venue_name}`,
//         [{ text: 'OK', onPress: () => {
//           fetchVenues(level);
//           setIsModalVisible(false);
//         }}]
//       );
//     } catch (error) {
//       let errorMessage = 'Failed to book venue';
//       if (error.response?.status === 409) {
//         errorMessage = 'You have already booked this venue';
//       } else if (error.response?.status === 403) {
//         errorMessage = 'You can only have one active booking at a time';
//       }
//       Alert.alert('Booking Failed', errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCancelBooking = async () => {
//     if (cancelText.toLowerCase() !== 'cancel') {
//       Alert.alert('Invalid Input', 'Please type "cancel" to confirm');
//       return;
//     }

//     try {
//       setLoading(true);
//       const response = await api.student.cancelBooking(selectedVenue.id);
      
//       setBookedVenues(bookedVenues.filter(id => id !== selectedVenue.id));
//       Alert.alert(
//         'Booking Cancelled',
//         `Your booking for ${selectedVenue.venue_name} has been cancelled`,
//         [{ text: 'OK', onPress: () => {
//           fetchVenues(level);
//           setIsModalVisible(false);
//           setCancelText('');
//         }}]
//       );
//     } catch (error) {
//       Alert.alert('Cancellation Failed', 'Failed to cancel booking. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchVenues(level);
//   }, [level]);

//   const handleLevelChange = (lvl) => {
//     setLevel(lvl);
//   };

//   const renderVenueItem = ({ item }) => (
//     <TouchableOpacity 
//       style={styles.venueCard}
//       onPress={() => openVenueDetails(item)}
//       disabled={loading}
//     >
//       <Text style={styles.venueName}>{item.venue_name}</Text>
//       <Text style={styles.detailText}>Timing: {item.session_timing || 'Not specified'}</Text>
//       <Text style={styles.detailText}>Capacity: {item.capacity}</Text>
//       <Text style={styles.detailText}>Remaining: {item.remaining}</Text>
//       {bookedVenues.includes(item.id) && (
//         <View style={styles.bookedTag}>
//           <Text style={styles.bookedTagText}>Booked</Text>
//         </View>
//       )}
//     </TouchableOpacity>
//   );

//   return (
//     <View style={globalStyles.container}>
//       <HamburgerHeader title="Available Sessions" showMenu={false} />
      
//       <View style={styles.content}>
//         <Text style={globalStyles.title}>Available Venues (Level {level})</Text>
        
//         <View style={[globalStyles.row, globalStyles.spaceBetween, { marginBottom: 20 }]}>
//           {[1, 2, 3].map((lvl) => (
//             <TouchableOpacity
//               key={lvl}
//               style={[
//                 globalStyles.button,
//                 level === lvl ? globalStyles.primaryButton : globalStyles.secondaryButton,
//                 { width: '30%' }
//               ]}
//               onPress={() => handleLevelChange(lvl)}
//               disabled={loading}
//             >
//               <Text style={level === lvl ? globalStyles.buttonText : globalStyles.secondaryButtonText}>
//                 Level {lvl}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>

//         {loading ? (
//           <ActivityIndicator size="large" color={colors.primary} />
//         ) : error ? (
//           <View style={styles.errorContainer}>
//             <Text style={styles.errorText}>{error}</Text>
//             <TouchableOpacity
//               style={[globalStyles.button, { marginTop: 10 }]}
//               onPress={() => fetchVenues(level)}
//             >
//               <Text style={globalStyles.buttonText}>Retry</Text>
//             </TouchableOpacity>
//           </View>
//         ) : venues.length === 0 ? (
//           <Text style={styles.noVenuesText}>No venues available for this level</Text>
//         ) : (
//           <FlatList
//             data={venues}
//             keyExtractor={item => item.id}
//             renderItem={renderVenueItem}
//           />
//         )}

//         <FloatingActionButton 
//           onPress={() => navigation.navigate('QrScanner')}
//           iconName="qr-code-scanner"
//         />
//       </View>

//       {/* Venue Details Modal */}
//       <Modal
//         visible={isModalVisible}
//         animationType="slide"
//         transparent={true}
//         onRequestClose={() => setIsModalVisible(false)}
//       >
//         <View style={styles.modalContainer}>
//           <View style={styles.modalContent}>
//             {selectedVenue && (
//               <>
//                 <Text style={styles.modalTitle}>{selectedVenue.venue_name}</Text>
//                 <Text style={styles.modalText}>Timing: {selectedVenue.session_timing}</Text>
//                 <Text style={styles.modalText}>Table: {selectedVenue.table_details}</Text>
//                 <Text style={styles.modalText}>Capacity: {selectedVenue.capacity}</Text>
//                 <Text style={styles.modalText}>Available: {selectedVenue.remaining}</Text>
                
//                 {isBooked ? (
//                   <>
//                     <Text style={styles.bookedText}>You have booked this venue</Text>
//                     <TextInput
//                       style={styles.input}
//                       placeholder="Type 'cancel' to confirm"
//                       value={cancelText}
//                       onChangeText={setCancelText}
//                     />
//                     <TouchableOpacity
//                       style={[
//                         globalStyles.button,
//                         styles.cancelButton,
//                         cancelText.toLowerCase() === 'cancel' && { backgroundColor: "green"}
//                       ]}
//                       onPress={() => {
//                         if (cancelText.toLowerCase() === 'cancel') {
//                           Alert.alert(
//                             'Confirm Cancellation',
//                             'Are you sure you want to cancel this booking?',
//                             [
//                               {
//                                 text: 'No',
//                                 style: 'cancel',
//                               },
//                               {
//                                 text: 'Yes',
//                                 onPress: handleCancelBooking,
//                               },
//                             ]
//                           );
//                         }
//                       }}
//                       disabled={loading || cancelText.toLowerCase() !== 'cancel'}
//                     >
//                       <Text style={globalStyles.buttonText}>Cancel Booking</Text>
//                     </TouchableOpacity>
//                   </>
//                 ) : (
//                   <TouchableOpacity
//                     style={[globalStyles.button, styles.bookButton]}
//                     onPress={handleBookVenue}
//                     disabled={loading || selectedVenue.remaining <= 0}
//                   >
//                     <Text style={globalStyles.buttonText}>
//                       {selectedVenue.remaining <= 0 ? 'Fully Booked' : 'Book Now'}
//                     </Text>
//                   </TouchableOpacity>
//                 )}
//               </>
//             )}
//             <TouchableOpacity
//               style={styles.closeButton}
//               onPress={() => {
//                 setIsModalVisible(false);
//                 setCancelText('');
//               }}
//             >
//               <Text style={styles.closeButtonText}>Close</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   venueCard: {
//     backgroundColor: '#fff',
//     borderRadius: 8,
//     padding: 16,
//     marginBottom: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   venueName: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: colors.primary,
//     marginBottom: 8,
//   },
//   detailText: {
//     fontSize: 14,
//     color: colors.textSecondary,
//     marginBottom: 4,
//   },
//   errorContainer: {
//     alignItems: 'center',
//     padding: 20,
//   },
//   errorText: {
//     color: colors.error,
//     textAlign: 'center',
//     marginBottom: 10,
//   },
//   noVenuesText: {
//     textAlign: 'center',
//     marginTop: 20,
//     color: colors.textSecondary,
//   },
//   modalContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(0,0,0,0.5)',
//   },
//   modalContent: {
//     backgroundColor: 'white',
//     padding: 20,
//     borderRadius: 10,
//     width: '90%',
//   },
//   modalTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     marginBottom: 15,
//     color: colors.primary,
//   },
//   modalText: {
//     fontSize: 16,
//     marginBottom: 10,
//   },
//   bookedText: {
//     fontSize: 16,
//     color: colors.success,
//     fontWeight: 'bold',
//     marginVertical: 10,
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 5,
//     padding: 10,
//     marginVertical: 10,
//   },
//   bookButton: {
//     marginTop: 20,
//     backgroundColor: colors.primary,
//   },
//   cancelButton: {
//     marginTop: 10,
//     backgroundColor: '#ccc',
//   },
//   closeButton: {
//     marginTop: 15,
//     alignSelf: 'center',
//   },
//   closeButtonText: {
//     color: colors.textSecondary,
//     fontSize: 16,
//   },
//   bookedTag: {
//     position: 'absolute',
//     right: 10,
//     bottom: 10,
//     backgroundColor: colors.success,
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 4,
//   },
//   bookedTagText: {
//     color: 'white',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   content: {
//     flex: 1,
//     padding: 20,
//   },
// });