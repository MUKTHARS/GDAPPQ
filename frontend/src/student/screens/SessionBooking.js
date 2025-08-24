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

  // Function to get different gradient colors based on venue ID
 const getVenueGradientColors = (venueId) => {
  // Array of unique gradient color combinations with reduced darkness
  const gradientColors = [
    ['#2a2a2a', '#555555'],       // Lighter charcoal to medium gray
    ['#3d005f', '#6d3ab0'],       // Lighter deep purple to vibrant purple
    ['#1a2940', '#243b5a'],       // Lighter navy blue to dark blue
    ['#2f3874', '#5aa0d9'],       // Lighter deep indigo to light blue
    ['#3d5069', '#ff6b6b'],       // Lighter dark blue to coral red
    ['#4d0a9b', '#ff4d94'],       // Lighter royal purple to hot pink
    ['#1c067d', '#6dd5ff'],       // Lighter deep blue to bright cyan
    ['#333842', '#4a5059'],       // Lighter dark slate to medium slate
    ['#3d1a36', '#e03e57'],       // Lighter burgundy to crimson
    ['#1f3458', '#2a5088'],       // Lighter dark navy to medium blue
    ['#55067a', '#6d3a9e'],       // Lighter deep violet to purple
    ['#24323c', '#4a9ac7'],       // Lighter almost black to steel blue
    ['#2a3f6b', '#6a7fa5'],       // Lighter dark blue to muted blue
    ['#4a00a8', '#b3008f'],       // Lighter electric purple to magenta
    ['#241075', '#4d3ca3'],       // Lighter deep indigo to medium purple
    ['#3c3e52', '#a4aec4'],       // Lighter dark blue-gray to light gray-blue
    ['#2c2965', '#4d629e'],       // Lighter deep blue to periwinkle
    ['#3a3242', '#4a4452'],       // Lighter dark purple-gray to medium gray
    ['#2d3d60', '#2e7d32'],       // Lighter navy blue to forest green
    ['#4e0787', '#8a13bf'],       // Lighter deep purple to vibrant purple
    ['#333842', '#00c9d6'],       // Lighter dark slate to teal
    ['#242642', '#1a4580'],       // Lighter deep navy to dark blue
    ['#3d0048', '#a52d9f'],       // Lighter deep purple to magenta
    ['#1f3458', '#1a4580'],       // Lighter navy blue variations
    ['#2e3034', '#65737e'],       // Lighter almost black to dark gray-blue
    ['#3d445a', '#3d3a8d'],       // Lighter dark blue to deep purple
    ['#2c2d31', '#4e5259'],       // Lighter charcoal to dark gray
    ['#3c3c74', '#5d5da5'],       // Lighter deep purple-blue variations
    ['#2e313b', '#3d445a'],       // Lighter dark blue-gray variations
    ['#3d1a36', '#a01a46'],       // Lighter deep burgundy to dark red
    ['#2f3874', '#3d5a9b'],       // Lighter navy blue to medium blue
    ['#3d005f', '#6600a0'],       // Lighter deep purple variations
    ['#242542', '#2a5088'],       // Lighter dark indigo to blue
    ['#333842', '#4a5059'],       // Lighter dark slate variations
    ['#3d5069', '#2f3874'],       // Lighter dark blue to navy
    ['#4a00a8', '#5a00ff'],       // Lighter electric purple to bright purple
    ['#241075', '#3d2a8d'],       // Lighter deep indigo variations
    ['#3c3e52', '#555770'],       // Lighter blue-gray variations
    ['#2c2965', '#2f3874'],       // Lighter deep blue variations
    ['#3a3242', '#4d3c64'],       // Lighter purple-gray variations
  ];
  
  // Convert venueId to a consistent number
  let id;
  if (typeof venueId === 'string') {
    let hash = 0;
    for (let i = 0; i < venueId.length; i++) {
      hash = ((hash << 5) - hash) + venueId.charCodeAt(i);
      hash = hash & hash;
    }
    id = Math.abs(hash);
  } else {
    id = venueId || 0;
  }
  
  const colorIndex = id % gradientColors.length;
  return gradientColors[colorIndex] || ['#2a2a2a', '#555555']; // Fallback to lighter charcoal
};

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
        colors={getVenueGradientColors(item.id)}
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
                <Icon name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.bookedBadgeText}>Booked</Text>
              </View>
            )}
          </View>

          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Icon name="schedule" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.infoLabel}>Timing</Text>
                <Text style={styles.infoValue}>{item.session_timing || 'Not specified'}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Icon name="group" size={16} color="rgba(255,255,255,0.7)" />
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
            <Icon name="keyboard-arrow-right" size={24} color="rgba(255,255,255,0.5)" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#667eea']}
      style={styles.container}
    >
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
          </View>
          <Text style={styles.title}>Find Your Perfect Session</Text>
          <Text style={styles.subtitle}>Level {level} Venues</Text>
        </View>

        <View style={styles.levelSelector}>
          {[1, 2, 3].map((lvl) => (
            <TouchableOpacity
              key={lvl}
              style={styles.levelButton}
              onPress={() => handleLevelChange(lvl)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={level === lvl ? 
                  ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)'] : 
                  ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
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
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.loadingCard}
            >
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Loading venues...</Text>
            </LinearGradient>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
              style={styles.errorCard}
            >
              <Icon name="error-outline" size={48} color="rgba(255,255,255,0.8)" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchVenues(level)}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)']}
                  style={styles.retryButtonGradient}
                >
                  <Icon name="refresh" size={20} color="#fff" />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : venues.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)']}
              style={styles.emptyCard}
            >
              <Icon name="event-busy" size={64} color="rgba(255,255,255,0.6)" />
              <Text style={styles.emptyTitle}>No Venues Available</Text>
              <Text style={styles.emptySubtitle}>Check back later for Level {level} venues</Text>
            </LinearGradient>
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

      {/* Modal with card popup style */}
      
<Modal
  visible={isModalVisible}
  animationType="fade"
  transparent={true}
  onRequestClose={() => setIsModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalCardContainer}>
      {selectedVenue && (
        <LinearGradient
          colors={getVenueGradientColors(selectedVenue.id)}
          style={styles.modalCardGradient}
        >
          <View style={styles.modalCardHeader}>
            <View>
              <Text style={styles.modalCardTitle}>{selectedVenue.venue_name}</Text>
              <Text style={styles.modalCardSubtitle}>Session Details</Text>
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

          <View style={styles.modalCardContent}>
            <View style={styles.modalCardInfoGrid}>
              <View style={styles.modalCardInfoItem}>
                <Icon name="schedule" size={20} color="rgba(255,255,255,0.8)" />
                <Text style={styles.modalCardInfoLabel}>Timing</Text>
                <Text style={styles.modalCardInfoValue}>{selectedVenue.session_timing}</Text>
              </View>
              
              <View style={styles.modalCardInfoItem}>
                <Icon name="table-restaurant" size={20} color="rgba(255,255,255,0.8)" />
                <Text style={styles.modalCardInfoLabel}>Table</Text>
                <Text style={styles.modalCardInfoValue}>{selectedVenue.table_details}</Text>
              </View>
              
              <View style={styles.modalCardInfoItem}>
                <Icon name="group" size={20} color="rgba(255,255,255,0.8)" />
                <Text style={styles.modalCardInfoLabel}>Capacity</Text>
                <Text style={styles.modalCardInfoValue}>{selectedVenue.capacity}</Text>
              </View>
              
              <View style={styles.modalCardInfoItem}>
                <Icon name="event-available" size={20} color="rgba(255,255,255,0.8)" />
                <Text style={styles.modalCardInfoLabel}>Available</Text>
                <Text style={styles.modalCardInfoValue}>{selectedVenue.remaining}</Text>
              </View>
            </View>
            
            {isBooked ? (
              <View style={styles.modalCardBookedSection}>
                <View style={styles.modalCardBookedStatus}>
                  <Icon name="check-circle" size={24} color="#4CAF50" />
                  <Text style={styles.modalCardBookedStatusText}>You have booked this venue</Text>
                </View>
                
                <TextInput
                  style={styles.modalCardCancelInput}
                  placeholder="Type 'cancel' to confirm cancellation"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={cancelText}
                  onChangeText={setCancelText}
                />
                
                <TouchableOpacity
                  style={styles.modalCardActionButton}
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
                    colors={cancelText.toLowerCase() === 'cancel' ? 
                      ['#F44336', '#E53935'] : 
                      ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                    style={styles.modalCardActionButtonGradient}
                  >
                    <Icon name="cancel" size={20} color="#fff" />
                    <Text style={styles.modalCardActionButtonText}>Cancel Booking</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.modalCardActionButton}
                onPress={handleBookVenue}
                disabled={loading || selectedVenue.remaining <= 0}
              >
                <LinearGradient
                  colors={selectedVenue.remaining <= 0 ? 
                    ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)'] : 
                    ['#4CAF50', '#43A047']}
                  style={styles.modalCardActionButtonGradient}
                >
                  <Icon name={selectedVenue.remaining <= 0 ? "block" : "event-available"} size={20} color="#fff" />
                  <Text style={styles.modalCardActionButtonText}>
                    {selectedVenue.remaining <= 0 ? 'Fully Booked' : 'Book Now'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      )}
    </View>
  </View>
</Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIconContainer: {
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 16,
  },
  headerIconGradient: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontWeight: '500',
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
    color: 'rgba(255,255,255,0.6)',
  },
  levelButtonTextActive: {
    color: '#fff',
  },
  venueCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
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
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  bookedBadgeText: {
    color: '#4CAF50',
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
    textAlign: 'center',
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
    paddingHorizontal: 40,
  },
  loadingCard: {
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    width: '100%',
  },
  errorText: {
    color: 'rgba(255,255,255,0.8)',
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
    paddingHorizontal: 40,
  },
  emptyCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    width: '100%',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 100,
  },
  // Modal styles for card popup
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCardContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalCardGradient: {
    padding: 0,
  },
  modalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  modalCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalCardContent: {
    padding: 20,
  },
  modalCardInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  modalCardInfoItem: {
    width: '50%',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalCardInfoLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    marginBottom: 4,
  },
  modalCardInfoValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalCardBookedSection: {
    marginTop: 10,
  },
  modalCardBookedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  modalCardBookedStatusText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  modalCardCancelInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalCardActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalCardActionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  modalCardActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
// import LinearGradient from 'react-native-linear-gradient';

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

//   const getAvailabilityColor = (remaining, capacity) => {
//     const percentage = (remaining / capacity) * 100;
//     if (percentage > 50) return '#4CAF50';
//     if (percentage > 20) return '#FF9800';
//     return '#F44336';
//   };

//   const renderVenueItem = ({ item }) => (
//     <TouchableOpacity 
//       style={styles.venueCard}
//       onPress={() => openVenueDetails(item)}
//       disabled={loading}
//       activeOpacity={0.8}
//     >
//       <LinearGradient
//         colors={bookedVenues.includes(item.id) ? 
//           ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)'] : 
//           ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
//         start={{x: 0, y: 0}}
//         end={{x: 1, y: 1}}
//         style={styles.gradientBackground}
//       >
//         <View style={styles.cardContent}>
//           <View style={styles.cardHeader}>
//             <View style={styles.venueNameContainer}>
//               <Icon name="place" size={20} color="#fff" style={styles.locationIcon} />
//               <Text style={styles.venueName}>{item.venue_name}</Text>
//             </View>
//             {bookedVenues.includes(item.id) && (
//               <View style={styles.bookedBadge}>
//                 <Icon name="check-circle" size={16} color="#4CAF50" />
//                 <Text style={styles.bookedBadgeText}>Booked</Text>
//               </View>
//             )}
//           </View>

//           <View style={styles.cardBody}>
//             <View style={styles.infoRow}>
//               <View style={styles.infoItem}>
//                 <Icon name="schedule" size={16} color="rgba(255,255,255,0.7)" />
//                 <Text style={styles.infoLabel}>Timing</Text>
//                 <Text style={styles.infoValue}>{item.session_timing || 'Not specified'}</Text>
//               </View>
              
//               <View style={styles.infoItem}>
//                 <Icon name="group" size={16} color="rgba(255,255,255,0.7)" />
//                 <Text style={styles.infoLabel}>Capacity</Text>
//                 <Text style={styles.infoValue}>{item.capacity}</Text>
//               </View>
//             </View>

//             <View style={styles.availabilitySection}>
//               <View style={styles.availabilityHeader}>
//                 <Text style={styles.availabilityLabel}>Available Spots</Text>
//                 <Text style={styles.availabilityNumber}>{item.remaining}</Text>
//               </View>
//               <View style={styles.progressBarContainer}>
//                 <View style={styles.progressBar}>
//                   <View 
//                     style={[
//                       styles.progressFill,
//                       { 
//                         width: `${(item.remaining / item.capacity) * 100}%`,
//                         backgroundColor: getAvailabilityColor(item.remaining, item.capacity)
//                       }
//                     ]} 
//                   />
//                 </View>
//                 <Text style={styles.progressText}>
//                   {Math.round((item.remaining / item.capacity) * 100)}%
//                 </Text>
//               </View>
//             </View>
//           </View>

//           <View style={styles.cardFooter}>
//             <View style={styles.statusIndicator}>
//               <View style={[
//                 styles.statusDot, 
//                 { backgroundColor: item.remaining > 0 ? '#4CAF50' : '#F44336' }
//               ]} />
//               <Text style={styles.statusText}>
//                 {item.remaining > 0 ? 'Available' : 'Full'}
//               </Text>
//             </View>
//             <Icon name="keyboard-arrow-right" size={24} color="rgba(255,255,255,0.5)" />
//           </View>
//         </View>
//       </LinearGradient>
//     </TouchableOpacity>
//   );

//   return (
//     <LinearGradient
//       colors={['#667eea', '#764ba2', '#667eea']}
//       style={styles.container}
//     >
      
//       <View style={styles.content}>
//         <View style={styles.header}>
//           <View style={styles.headerIconContainer}>
//             <LinearGradient
//               colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)']}
//               style={styles.headerIconGradient}
//             >
//               <Icon name="event-available" size={32} color="#fff" />
//             </LinearGradient>
//           </View>
//           <Text style={styles.title}>Find Your Perfect Session</Text>
//           <Text style={styles.subtitle}>Level {level} Venues</Text>
//         </View>

//         <View style={styles.levelSelector}>
//           {[1, 2, 3].map((lvl) => (
//             <TouchableOpacity
//               key={lvl}
//               style={styles.levelButton}
//               onPress={() => handleLevelChange(lvl)}
//               disabled={loading}
//               activeOpacity={0.7}
//             >
//               <LinearGradient
//                 colors={level === lvl ? 
//                   ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)'] : 
//                   ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
//                 style={styles.levelButtonGradient}
//               >
//                 <Text style={[
//                   styles.levelButtonText,
//                   level === lvl && styles.levelButtonTextActive
//                 ]}>
//                   Level {lvl}
//                 </Text>
//               </LinearGradient>
//             </TouchableOpacity>
//           ))}
//         </View>

//         {loading ? (
//           <View style={styles.loadingContainer}>
//             <LinearGradient
//               colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
//               style={styles.loadingCard}
//             >
//               <ActivityIndicator size="large" color="#fff" />
//               <Text style={styles.loadingText}>Loading venues...</Text>
//             </LinearGradient>
//           </View>
//         ) : error ? (
//           <View style={styles.errorContainer}>
//             <LinearGradient
//               colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
//               style={styles.errorCard}
//             >
//               <Icon name="error-outline" size={48} color="rgba(255,255,255,0.8)" />
//               <Text style={styles.errorText}>{error}</Text>
//               <TouchableOpacity
//                 style={styles.retryButton}
//                 onPress={() => fetchVenues(level)}
//               >
//                 <LinearGradient
//                   colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)']}
//                   style={styles.retryButtonGradient}
//                 >
//                   <Icon name="refresh" size={20} color="#fff" />
//                   <Text style={styles.retryButtonText}>Retry</Text>
//                 </LinearGradient>
//               </TouchableOpacity>
//             </LinearGradient>
//           </View>
//         ) : venues.length === 0 ? (
//           <View style={styles.emptyContainer}>
//             <LinearGradient
//               colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.1)']}
//               style={styles.emptyCard}
//             >
//               <Icon name="event-busy" size={64} color="rgba(255,255,255,0.6)" />
//               <Text style={styles.emptyTitle}>No Venues Available</Text>
//               <Text style={styles.emptySubtitle}>Check back later for Level {level} venues</Text>
//             </LinearGradient>
//           </View>
//         ) : (
//           <FlatList
//             data={venues}
//             keyExtractor={item => item.id}
//             renderItem={renderVenueItem}
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={styles.listContainer}
//           />
//         )}

//         <FloatingActionButton 
//           onPress={() => navigation.navigate('QrScanner')}
//           iconName="qr-code-scanner"
//         />
//       </View>

//       {/* Modal with matching design */}
//       <Modal
//         visible={isModalVisible}
//         animationType="slide"
//         transparent={true}
//         onRequestClose={() => setIsModalVisible(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContainer}>
//             <LinearGradient
//               colors={['#667eea', '#764ba2', '#667eea']}
//               style={styles.modalGradient}
//             >
//               {selectedVenue && (
//                 <>
//                   <View style={styles.modalHeader}>
//                     <View>
//                       <Text style={styles.modalTitle}>{selectedVenue.venue_name}</Text>
//                       <Text style={styles.modalSubtitle}>Session Details</Text>
//                     </View>
//                     <TouchableOpacity
//                       style={styles.modalCloseButton}
//                       onPress={() => {
//                         setIsModalVisible(false);
//                         setCancelText('');
//                       }}
//                     >
//                       <Icon name="close" size={24} color="#fff" />
//                     </TouchableOpacity>
//                   </View>

//                   <View style={styles.modalContent}>
//                     <View style={styles.modalInfoGrid}>
//                       <View style={styles.modalInfoItem}>
//                         <Icon name="schedule" size={20} color="rgba(255,255,255,0.8)" />
//                         <Text style={styles.modalInfoLabel}>Timing</Text>
//                         <Text style={styles.modalInfoValue}>{selectedVenue.session_timing}</Text>
//                       </View>
                      
//                       <View style={styles.modalInfoItem}>
//                         <Icon name="table-restaurant" size={20} color="rgba(255,255,255,0.8)" />
//                         <Text style={styles.modalInfoLabel}>Table</Text>
//                         <Text style={styles.modalInfoValue}>{selectedVenue.table_details}</Text>
//                       </View>
                      
//                       <View style={styles.modalInfoItem}>
//                         <Icon name="group" size={20} color="rgba(255,255,255,0.8)" />
//                         <Text style={styles.modalInfoLabel}>Capacity</Text>
//                         <Text style={styles.modalInfoValue}>{selectedVenue.capacity}</Text>
//                       </View>
                      
//                       <View style={styles.modalInfoItem}>
//                         <Icon name="event-available" size={20} color="rgba(255,255,255,0.8)" />
//                         <Text style={styles.modalInfoLabel}>Available</Text>
//                         <Text style={styles.modalInfoValue}>{selectedVenue.remaining}</Text>
//                       </View>
//                     </View>
                    
//                     {isBooked ? (
//                       <View style={styles.bookedSection}>
//                         <View style={styles.bookedStatus}>
//                           <Icon name="check-circle" size={24} color="#4CAF50" />
//                           <Text style={styles.bookedStatusText}>You have booked this venue</Text>
//                         </View>
                        
//                         <TextInput
//                           style={styles.cancelInput}
//                           placeholder="Type 'cancel' to confirm cancellation"
//                           placeholderTextColor="rgba(255,255,255,0.6)"
//                           value={cancelText}
//                           onChangeText={setCancelText}
//                         />
                        
//                         <TouchableOpacity
//                           style={styles.actionButton}
//                           onPress={() => {
//                             if (cancelText.toLowerCase() === 'cancel') {
//                               Alert.alert(
//                                 'Confirm Cancellation',
//                                 'Are you sure you want to cancel this booking?',
//                                 [
//                                   { text: 'No', style: 'cancel' },
//                                   { text: 'Yes', onPress: handleCancelBooking }
//                                 ]
//                               );
//                             }
//                           }}
//                           disabled={loading || cancelText.toLowerCase() !== 'cancel'}
//                         >
//                           <LinearGradient
//                             colors={cancelText.toLowerCase() === 'cancel' ? 
//                               ['#F44336', '#E53935'] : 
//                               ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
//                             style={styles.actionButtonGradient}
//                           >
//                             <Icon name="cancel" size={20} color="#fff" />
//                             <Text style={styles.actionButtonText}>Cancel Booking</Text>
//                           </LinearGradient>
//                         </TouchableOpacity>
//                       </View>
//                     ) : (
//                       <TouchableOpacity
//                         style={styles.actionButton}
//                         onPress={handleBookVenue}
//                         disabled={loading || selectedVenue.remaining <= 0}
//                       >
//                         <LinearGradient
//                           colors={selectedVenue.remaining <= 0 ? 
//                             ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)'] : 
//                             ['#4CAF50', '#43A047']}
//                           style={styles.actionButtonGradient}
//                         >
//                           <Icon name={selectedVenue.remaining <= 0 ? "block" : "event-available"} size={20} color="#fff" />
//                           <Text style={styles.actionButtonText}>
//                             {selectedVenue.remaining <= 0 ? 'Fully Booked' : 'Book Now'}
//                           </Text>
//                         </LinearGradient>
//                       </TouchableOpacity>
//                     )}
//                   </View>
//                 </>
//               )}
//             </LinearGradient>
//           </View>
//         </View>
//       </Modal>
//     </LinearGradient>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   content: {
//     flex: 1,
//     padding: 20,
//     paddingTop: 30,
//   },
//   header: {
//     alignItems: 'center',
//     marginBottom: 32,
//   },
//   headerIconContainer: {
//     borderRadius: 30,
//     overflow: 'hidden',
//     marginBottom: 16,
//   },
//   headerIconGradient: {
//     padding: 16,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: '800',
//     color: '#fff',
//     textAlign: 'center',
//     marginBottom: 8,
//     textShadowColor: 'rgba(0,0,0,0.3)',
//     textShadowOffset: { width: 0, height: 2 },
//     textShadowRadius: 4,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: 'rgba(255,255,255,0.8)',
//     textAlign: 'center',
//     fontWeight: '500',
//   },
//   levelSelector: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 24,
//     paddingHorizontal: 8,
//   },
//   levelButton: {
//     flex: 1,
//     marginHorizontal: 4,
//     borderRadius: 12,
//     overflow: 'hidden',
//   },
//   levelButtonGradient: {
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     alignItems: 'center',
//   },
//   levelButtonText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: 'rgba(255,255,255,0.6)',
//   },
//   levelButtonTextActive: {
//     color: '#fff',
//   },
//   venueCard: {
//     marginBottom: 16,
//     borderRadius: 20,
//     overflow: 'hidden',
//   },
//   gradientBackground: {
//     padding: 20,
//   },
//   cardContent: {
//     flex: 1,
//   },
//   cardHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   venueNameContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flex: 1,
//   },
//   locationIcon: {
//     marginRight: 8,
//   },
//   venueName: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#fff',
//     flex: 1,
//   },
//   bookedBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'rgba(76, 175, 80, 0.2)',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 20,
//     borderWidth: 1,
//     borderColor: '#4CAF50',
//   },
//   bookedBadgeText: {
//     color: '#4CAF50',
//     fontSize: 12,
//     fontWeight: '600',
//     marginLeft: 4,
//   },
//   cardBody: {
//     marginBottom: 16,
//   },
//   infoRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 16,
//   },
//   infoItem: {
//     flex: 1,
//     alignItems: 'center',
//   },
//   infoLabel: {
//     fontSize: 12,
//     color: 'rgba(255,255,255,0.7)',
//     marginTop: 4,
//     marginBottom: 2,
//   },
//   infoValue: {
//     fontSize: 16,
//     color: '#fff',
//     fontWeight: '600',
//     textAlign: 'center',
//   },
//   availabilitySection: {
//     backgroundColor: 'rgba(255,255,255,0.1)',
//     borderRadius: 12,
//     padding: 12,
//   },
//   availabilityHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   availabilityLabel: {
//     fontSize: 14,
//     color: 'rgba(255,255,255,0.8)',
//     fontWeight: '500',
//   },
//   availabilityNumber: {
//     fontSize: 18,
//     color: '#fff',
//     fontWeight: '700',
//   },
//   progressBarContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   progressBar: {
//     flex: 1,
//     height: 6,
//     backgroundColor: 'rgba(255,255,255,0.2)',
//     borderRadius: 3,
//     overflow: 'hidden',
//   },
//   progressFill: {
//     height: '100%',
//     borderRadius: 3,
//   },
//   progressText: {
//     fontSize: 12,
//     color: '#fff',
//     fontWeight: '600',
//     marginLeft: 8,
//     minWidth: 35,
//     textAlign: 'right',
//   },
//   cardFooter: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   statusIndicator: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   statusDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     marginRight: 6,
//   },
//   statusText: {
//     fontSize: 14,
//     color: 'rgba(255,255,255,0.8)',
//     fontWeight: '500',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 40,
//   },
//   loadingCard: {
//     borderRadius: 20,
//     paddingVertical: 40,
//     paddingHorizontal: 32,
//     alignItems: 'center',
//     width: '100%',
//   },
//   loadingText: {
//     marginTop: 16,
//     fontSize: 16,
//     color: 'rgba(255,255,255,0.8)',
//     fontWeight: '500',
//   },
//   errorContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 40,
//   },
//   errorCard: {
//     borderRadius: 20,
//     padding: 40,
//     alignItems: 'center',
//     width: '100%',
//   },
//   errorText: {
//     color: 'rgba(255,255,255,0.8)',
//     textAlign: 'center',
//     fontSize: 16,
//     marginVertical: 16,
//     lineHeight: 24,
//   },
//   retryButton: {
//     borderRadius: 12,
//     overflow: 'hidden',
//     marginTop: 8,
//   },
//   retryButtonGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 24,
//     paddingVertical: 12,
//   },
//   retryButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//     marginLeft: 8,
//   },
//   emptyContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 40,
//   },
//   emptyCard: {
//     borderRadius: 20,
//     padding: 40,
//     alignItems: 'center',
//     width: '100%',
//   },
//   emptyTitle: {
//     fontSize: 20,
//     fontWeight: '600',
//     color: 'rgba(255,255,255,0.9)',
//     marginTop: 16,
//     marginBottom: 8,
//     textAlign: 'center',
//   },
//   emptySubtitle: {
//     fontSize: 16,
//     color: 'rgba(255,255,255,0.7)',
//     textAlign: 'center',
//   },
//   listContainer: {
//     paddingBottom: 100,
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.6)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   modalContainer: {
//     width: '100%',
//     maxHeight: '90%',
//     borderRadius: 24,
//     overflow: 'hidden',
//   },
//   modalGradient: {
//     flex: 1,
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 24,
//     borderBottomWidth: 1,
//     borderBottomColor: 'rgba(255,255,255,0.1)',
//   },
//   modalTitle: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: '#fff',
//     marginBottom: 4,
//   },
//   modalSubtitle: {
//     fontSize: 16,
//     color: 'rgba(255,255,255,0.7)',
//   },
//   modalCloseButton: {
//     padding: 8,
//     borderRadius: 20,
//     backgroundColor: 'rgba(255,255,255,0.1)',
//   },
//   modalContent: {
//     padding: 24,
//   },
//   modalInfoGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     marginBottom: 24,
//   },
//   modalInfoItem: {
//     width: '50%',
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   modalInfoLabel: {
//     fontSize: 12,
//     color: 'rgba(255,255,255,0.7)',
//     marginTop: 8,
//     marginBottom: 4,
//   },
//   modalInfoValue: {
//     fontSize: 16,
//     color: '#fff',
//     fontWeight: '600',
//     textAlign: 'center',
//   },
//   bookedSection: {
//     marginTop: 16,
//   },
//   bookedStatus: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: 'rgba(255,255,255,0.1)',
//     borderRadius: 12,
//     paddingVertical: 12,
//     marginBottom: 20,
//   },
//   bookedStatusText: {
//     fontSize: 16,
//     color: '#fff',
//     fontWeight: '600',
//     marginLeft: 8,
//   },
//   cancelInput: {
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.3)',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 20,
//     fontSize: 16,
//     color: '#fff',
//     backgroundColor: 'rgba(255,255,255,0.1)',
//   },
//   actionButton: {
//     borderRadius: 12,
//     overflow: 'hidden',
//   },
//   actionButtonGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 16,
//     paddingHorizontal: 24,
//   },
//   actionButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//     marginLeft: 8,
//   },
// });
