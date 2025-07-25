import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { globalStyles, colors } from '../../student/assets/globalStyles';
import api from '../services/api';
import AdminHamburgerHeader from '../components/AdminHamburgerHeader';

export default function BookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/bookings');
      if (response.data && Array.isArray(response.data)) {
        setBookings(response.data);
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      setError(error.response?.data?.error || error.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const renderBookingItem = ({ item }) => (
    <View style={styles.bookingCard}>
      <Text style={styles.studentName}>{item.student_name}</Text>
      <Text style={styles.detailText}>Venue: {item.venue_name}</Text>
      <Text style={styles.detailText}>Level: {item.session_level}</Text>
      <Text style={styles.detailText}>Booked at: {new Date(item.booked_at).toLocaleString()}</Text>
    </View>
  );

  return (
    <View style={globalStyles.container}>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchBookings}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : bookings.length === 0 ? (
        <Text style={styles.noBookingsText}>No active bookings found</Text>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => `${item.student_id}-${item.session_id}`}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bookingCard: {
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
  studentName: {
    fontSize: 16,
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
  noBookingsText: {
    textAlign: 'center',
    marginTop: 20,
    color: colors.textSecondary,
  },
  listContainer: {
    padding: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  retryButtonText: {
    color: 'white',
    textAlign: 'center',
  },
});


// import React, { useState, useEffect } from 'react';
// import { View, FlatList, Text, StyleSheet, ActivityIndicator } from 'react-native';
// import { globalStyles, colors } from '../../student/assets/globalStyles';

// import api from '../services/api';
// import AdminHamburgerHeader from '../components/AdminHamburgerHeader';

// export default function BookingsScreen({ navigation }) {
//   const [bookings, setBookings] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     fetchBookings();
//   }, []);

//   const fetchBookings = async () => {
//     try {
//       setLoading(true);
//       setError(null);
//       const response = await api.get('/admin/bookings');
//       setBookings(response.data);
//     } catch (error) {
//       console.error('Failed to fetch bookings:', error);
//       setError(error.response?.data?.error || 'Failed to load bookings');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const renderBookingItem = ({ item }) => (
//     <View style={styles.bookingCard}>
//       <Text style={styles.studentName}>{item.student_name}</Text>
//       <Text style={styles.detailText}>Venue: {item.venue_name}</Text>
//       <Text style={styles.detailText}>Level: {item.session_level}</Text>
//       <Text style={styles.detailText}>Booked at: {new Date(item.booked_at).toLocaleString()}</Text>
//     </View>
//   );

//   return (
//     <View style={globalStyles.container}>
//       {/* <AdminHamburgerHeader 
//         title="Student Bookings" 
//         navigation={navigation} 
//       /> */}
      
//       {loading ? (
//         <ActivityIndicator size="large" color={colors.primary} />
//       ) : error ? (
//         <View style={styles.errorContainer}>
//           <Text style={styles.errorText}>{error}</Text>
//         </View>
//       ) : bookings.length === 0 ? (
//         <Text style={styles.noBookingsText}>No active bookings found</Text>
//       ) : (
//         <FlatList
//           data={bookings}
//           keyExtractor={item => `${item.student_id}-${item.session_id}`}
//           renderItem={renderBookingItem}
//           contentContainerStyle={styles.listContainer}
//         />
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   bookingCard: {
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
//   studentName: {
//     fontSize: 16,
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
//   },
//   noBookingsText: {
//     textAlign: 'center',
//     marginTop: 20,
//     color: colors.textSecondary,
//   },
//   listContainer: {
//     padding: 16,
//   },
// });