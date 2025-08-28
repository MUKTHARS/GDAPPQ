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

  // Function to get different colors based on venue ID for subtle variety
  const getVenueAccentColor = (venueId) => {
    const accentColors = [
      '#4F46E5', // Indigo
      '#7C3AED', // Purple
      '#2563EB', // Blue
      '#059669', // Emerald
      '#DC2626', // Red
      '#EA580C', // Orange
      '#0891B2', // Cyan
      '#9333EA', // Violet
      '#16A34A', // Green
      '#C2410C', // Orange-red
    ];
    
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
    
    const colorIndex = id % accentColors.length;
    return accentColors[colorIndex] || '#4F46E5';
  };

  // Function to get gradient colors for venue cards
  const getVenueGradientColors = (venueId) => {
    const baseColor = getVenueAccentColor(venueId);
    // Create a darker version for gradient
    const darkColor = baseColor + '15'; // 15% opacity
    const lighterColor = baseColor + '25'; // 25% opacity
    return [darkColor, lighterColor];
  };

  // Function to get line pattern type based on venue ID
  const getPatternType = (venueId) => {
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
    
    const patterns = ['diagonal', 'grid', 'vertical', 'dots'];
    return patterns[id % patterns.length];
  };

  // Function to render pattern overlay
  const renderPatternOverlay = (venueId) => {
    const patternType = getPatternType(venueId);
    const accentColor = getVenueAccentColor(venueId);
    
    switch (patternType) {
      case 'diagonal':
        return (
          <View style={styles.patternOverlay}>
            {[...Array(8)].map((_, i) => (
              <View 
                key={i}
                style={[
                  styles.diagonalLine,
                  { 
                    backgroundColor: accentColor + '08',
                    left: i * 40 - 20,
                  }
                ]} 
              />
            ))}
          </View>
        );
      case 'grid':
        return (
          <View style={styles.patternOverlay}>
            {[...Array(6)].map((_, i) => (
              <View key={`h-${i}`}>
                <View 
                  style={[
                    styles.horizontalLine,
                    { 
                      backgroundColor: accentColor + '06',
                      top: i * 30,
                    }
                  ]} 
                />
              </View>
            ))}
            {[...Array(4)].map((_, i) => (
              <View key={`v-${i}`}>
                <View 
                  style={[
                    styles.verticalLine,
                    { 
                      backgroundColor: accentColor + '06',
                      left: i * 80,
                    }
                  ]} 
                />
              </View>
            ))}
          </View>
        );
      case 'vertical':
        return (
          <View style={styles.patternOverlay}>
            {[...Array(6)].map((_, i) => (
              <View 
                key={i}
                style={[
                  styles.verticalLine,
                  { 
                    backgroundColor: accentColor + '08',
                    left: i * 50,
                  }
                ]} 
              />
            ))}
          </View>
        );
      case 'dots':
        return (
          <View style={styles.patternOverlay}>
            {[...Array(40)].map((_, i) => {
              const row = Math.floor(i / 8);
              const col = i % 8;
              return (
                <View 
                  key={i}
                  style={[
                    styles.dot,
                    { 
                      backgroundColor: accentColor + '08',
                      left: col * 40,
                      top: row * 30,
                    }
                  ]} 
                />
              );
            })}
          </View>
        );
      default:
        return null;
    }
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
    if (percentage > 50) return '#10B981';
    if (percentage > 20) return '#F59E0B';
    return '#EF4444';
  };

  const renderVenueItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.venueCard, { borderLeftColor: getVenueAccentColor(item.id) }]}
      onPress={() => openVenueDetails(item)}
      disabled={loading}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={getVenueGradientColors(item.id)}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.venueCardGradient}
      >
        {renderPatternOverlay(item.id)}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.venueNameContainer}>
              <View style={[styles.venueIconContainer, { backgroundColor: getVenueAccentColor(item.id) + '40' }]}>
                <Icon name="place" size={18} color={getVenueAccentColor(item.id)} />
              </View>
              <Text style={styles.venueName}>{item.venue_name}</Text>
            </View>
            {bookedVenues.includes(item.id) && (
              <View style={styles.bookedBadge}>
                <Icon name="check-circle" size={14} color="#10B981" />
                <Text style={styles.bookedBadgeText}>Booked</Text>
              </View>
            )}
          </View>

          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Icon name="schedule" size={16} color="#CBD5E1" />
                <Text style={styles.infoLabel}>Timing</Text>
                <Text style={styles.infoValue}>{item.session_timing || 'Not specified'}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Icon name="group" size={16} color="#CBD5E1" />
                <Text style={styles.infoLabel}>Capacity</Text>
                <Text style={styles.infoValue}>{item.capacity}</Text>
              </View>
            </View>

            <View style={styles.availabilitySection}>
              <View style={styles.availabilityHeader}>
                <Text style={styles.availabilityLabel}>Available Spots</Text>
                <Text style={[styles.availabilityNumber, { color: getAvailabilityColor(item.remaining, item.capacity) }]}>
                  {item.remaining}
                </Text>
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
                { backgroundColor: item.remaining > 0 ? '#10B981' : '#EF4444' }
              ]} />
              <Text style={styles.statusText}>
                {item.remaining > 0 ? 'Available' : 'Full'}
              </Text>
            </View>
            <Icon name="keyboard-arrow-right" size={20} color="#CBD5E1" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Session Booking</Text>
          <Text style={styles.subtitle}>Find and book your discussion sessions</Text>
        </View>

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
              <Text style={[
                styles.levelButtonText,
                level === lvl && styles.levelButtonTextActive
              ]}>
                Level {lvl}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loadingText}>Loading venues...</Text>
            </View>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorCard}>
              <Icon name="error-outline" size={48} color="#6B7280" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchVenues(level)}
              >
                <Icon name="refresh" size={18} color="#4F46E5" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : venues.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCard}>
              <Icon name="event-busy" size={64} color="#4B5563" />
              <Text style={styles.emptyTitle}>No Sessions Available</Text>
              <Text style={styles.emptySubtitle}>Check back later for Level {level} sessions</Text>
            </View>
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

      {/* Modal with dark theme */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedVenue && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderContent}>
                    <View style={[styles.modalIconContainer, { backgroundColor: getVenueAccentColor(selectedVenue.id) + '20' }]}>
                      <Icon name="place" size={24} color={getVenueAccentColor(selectedVenue.id)} />
                    </View>
                    <View style={styles.modalTitleContainer}>
                      <Text style={styles.modalTitle}>{selectedVenue.venue_name}</Text>
                      <Text style={styles.modalSubtitle}>Session Details</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => {
                      setIsModalVisible(false);
                      setCancelText('');
                    }}
                  >
                    <Icon name="close" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalContent}>
                  <View style={styles.modalInfoGrid}>
                    <View style={styles.modalInfoItem}>
                      <Icon name="schedule" size={20} color="#6B7280" />
                      <Text style={styles.modalInfoLabel}>Timing</Text>
                      <Text style={styles.modalInfoValue}>{selectedVenue.session_timing}</Text>
                    </View>
                    
                    <View style={styles.modalInfoItem}>
                      <Icon name="table-restaurant" size={20} color="#6B7280" />
                      <Text style={styles.modalInfoLabel}>Table</Text>
                      <Text style={styles.modalInfoValue}>{selectedVenue.table_details}</Text>
                    </View>
                    
                    <View style={styles.modalInfoItem}>
                      <Icon name="group" size={20} color="#6B7280" />
                      <Text style={styles.modalInfoLabel}>Capacity</Text>
                      <Text style={styles.modalInfoValue}>{selectedVenue.capacity}</Text>
                    </View>
                    
                    <View style={styles.modalInfoItem}>
                      <Icon name="event-available" size={20} color="#6B7280" />
                      <Text style={styles.modalInfoLabel}>Available</Text>
                      <Text style={[styles.modalInfoValue, { color: getAvailabilityColor(selectedVenue.remaining, selectedVenue.capacity) }]}>
                        {selectedVenue.remaining}
                      </Text>
                    </View>
                  </View>
                  
                  {isBooked ? (
                    <View style={styles.modalBookedSection}>
                      <View style={styles.modalBookedStatus}>
                        <Icon name="check-circle" size={20} color="#10B981" />
                        <Text style={styles.modalBookedStatusText}>You have booked this session</Text>
                      </View>
                      
                      <TextInput
                        style={styles.modalCancelInput}
                        placeholder="Type 'cancel' to confirm cancellation"
                        placeholderTextColor="#6B7280"
                        value={cancelText}
                        onChangeText={setCancelText}
                      />
                      
                      <TouchableOpacity
                        style={[
                          styles.modalActionButton,
                          styles.modalCancelButton,
                          cancelText.toLowerCase() !== 'cancel' && styles.modalActionButtonDisabled
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
                        <Icon name="cancel" size={18} color="#fff" />
                        <Text style={styles.modalActionButtonText}>Cancel Booking</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.modalActionButton,
                        styles.modalBookButton,
                        selectedVenue.remaining <= 0 && styles.modalActionButtonDisabled
                      ]}
                      onPress={handleBookVenue}
                      disabled={loading || selectedVenue.remaining <= 0}
                    >
                      <Icon name={selectedVenue.remaining <= 0 ? "block" : "event-available"} size={18} color="#fff" />
                      <Text style={styles.modalActionButtonText}>
                        {selectedVenue.remaining <= 0 ? 'Fully Booked' : 'Book Session'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1bff',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 20,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '400',
  },
  levelSelector: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  levelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  levelButtonActive: {
    backgroundColor: '#4F46E5',
  },
  levelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  levelButtonTextActive: {
    color: '#FFFFFF',
  },
  venueCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  venueCardGradient: {
    flex: 1,
    position: 'relative',
  },
  patternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  diagonalLine: {
    position: 'absolute',
    width: 4,
    height: '200%',
    transform: [{ rotate: '45deg' }],
  },
  horizontalLine: {
    position: 'absolute',
    width: '100%',
    height: 4,
  },
  verticalLine: {
    position: 'absolute',
    width: 4,
    height: '100%',
  },
  dot: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
  },
  cardContent: {
    padding: 20,
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
  venueIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  venueName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    flex: 1,
  },
  bookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  bookedBadgeText: {
    color: '#10B981',
    fontSize: 11,
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
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#F8FAFC',
    fontWeight: '600',
    textAlign: 'center',
  },
  availabilitySection: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    padding: 16,
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  availabilityLabel: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  availabilityNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '600',
    marginLeft: 12,
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
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    width: '100%',
  },
  errorText: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 16,
    marginVertical: 16,
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F8FAFC',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 100,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  modalContent: {
    padding: 20,
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
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  modalInfoValue: {
    fontSize: 16,
    color: '#F8FAFC',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalBookedSection: {
    marginTop: 4,
  },
  modalBookedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#064E3B',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  modalBookedStatusText: {
    fontSize: 15,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 8,
  },
  modalCancelInput: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#F8FAFC',
    backgroundColor: '#0a0f1bff',
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  modalBookButton: {
    backgroundColor: '#4F46E5',
  },
  modalCancelButton: {
    backgroundColor: '#DC2626',
  },
  modalActionButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.6,
  },
  modalActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
