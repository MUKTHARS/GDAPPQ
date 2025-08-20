import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Button, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import QRCode from 'react-native-qrcode-svg';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function QrScreen({ route, navigation }) {
  const [qrData, setQrData] = useState(null);
  const [expiryTime, setExpiryTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentQRId, setCurrentQRId] = useState(null);
  const [qrStats, setQrStats] = useState({
    maxCapacity: 0,
    currentUsage: 0,
    remainingSlots: 0,
    isNew: false
  });

  if (!route?.params?.venue?.id) {
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

  const { venue } = route.params;

  // Get stored QR data for this venue
  const getStoredQR = async () => {
    try {
      const storedData = await AsyncStorage.getItem(`qr_${venue.id}`);
      if (storedData) {
        const { qrData, expiry, qrId, isFull } = JSON.parse(storedData);
        // Don't use stored QR if it's full
        if (!isFull && new Date(expiry) > new Date()) {
          return { qrData, expiry, qrId };
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting stored QR:', error);
      return null;
    }
  };

  // Store QR data for this venue
  const storeQR = async (qrData, expiry, qrId, isFull = false) => {
    try {
      await AsyncStorage.setItem(`qr_${venue.id}`, JSON.stringify({
        qrData,
        expiry,
        qrId,
        isFull
      }));
    } catch (error) {
      console.error('Error storing QR:', error);
    }
  };

  const fetchQR = async (forceNew = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if we have a valid stored QR code that's not full
      if (!forceNew) {
        const stored = await getStoredQR();
        if (stored) {
          setQrData(stored.qrData);
          setExpiryTime(new Date(stored.expiry).toLocaleTimeString());
          setCurrentQRId(stored.qrId);
          
          // Fetch current usage stats
          try {
            const statsResponse = await api.get('/admin/qr/manage', {
              params: { venue_id: venue.id }
            });
            
            if (statsResponse.data && Array.isArray(statsResponse.data)) {
              const currentQR = statsResponse.data.find(qr => qr.id === stored.qrId);
              if (currentQR) {
                setQrStats({
                  maxCapacity: currentQR.max_capacity,
                  currentUsage: currentQR.current_usage,
                  remainingSlots: currentQR.remaining,
                  isNew: false
                });
                
                // Update storage if QR is now full
                if (currentQR.current_usage >= currentQR.max_capacity) {
                  await storeQR(stored.qrData, stored.expiry, stored.qrId, true);
                }
              }
            }
          } catch (statsError) {
            console.error('Error fetching QR stats:', statsError);
          }
          
          setIsLoading(false);
          return;
        }
      }

      // Add validation for venue ID
      if (!venue?.id || typeof venue.id !== 'string' || venue.id.trim() === '') {
        throw new Error('Invalid venue information');
      }

      const response = await api.get('/admin/qr', {
        params: { 
          venue_id: venue.id.toString(),
          force_new: forceNew
        },
        timeout: 24000
      });
      
      if (response.data?.qr_string) {
        const expiry = new Date(response.data.expires_at);
        
        setQrData(response.data.qr_string);
        setExpiryTime(expiry.toLocaleTimeString());
        setCurrentQRId(response.data.qr_id);
        
        // Update stats - use venue capacity as max capacity
        const maxCapacity = venue.capacity || response.data.max_capacity || 2;
        const currentUsage = response.data.current_usage || 0;
        const remainingSlots = maxCapacity - currentUsage;
        
        setQrStats({
          maxCapacity: maxCapacity,
          currentUsage: currentUsage,
          remainingSlots: remainingSlots,
          isNew: response.data.is_new || false
        });
        
        // Store the new QR code
        const isFull = currentUsage >= maxCapacity;
        await storeQR(response.data.qr_string, expiry.toISOString(), response.data.qr_id, isFull);
        
        // Show alert if this is a new QR code
        if (response.data.is_new) {
          Alert.alert(
            'New QR Code Generated',
            'A new QR code has been created for this venue.',
            [{ text: 'OK' }]
          );
        }
      } else {
        throw new Error(response.data?.error || 'Invalid QR data received');
      }
    } catch (error) {
      console.error('QR Generation Error:', error.message);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh QR when it becomes full
  useEffect(() => {
    const checkQRStatus = async () => {
      if (currentQRId && qrStats.remainingSlots === 0 && !qrStats.isNew) {
        // QR is full, generate a new one automatically
        console.log('QR is full, generating new one...');
        await fetchQR(true);
      }
    };

    checkQRStatus();
  }, [qrStats.remainingSlots, currentQRId]);

  useEffect(() => {
    fetchQR();
    
    // Set up interval to check QR status every 30 seconds
    const interval = setInterval(async () => {
      if (currentQRId && !qrStats.isNew) {
        try {
          const statsResponse = await api.get('/admin/qr/manage', {
            params: { venue_id: venue.id }
          });
          
          if (statsResponse.data && Array.isArray(statsResponse.data)) {
            const currentQR = statsResponse.data.find(qr => qr.id === currentQRId);
            if (currentQR) {
              setQrStats(prev => ({
                ...prev,
                currentUsage: currentQR.current_usage,
                remainingSlots: currentQR.remaining
              }));
              
              // Update storage if QR is now full
              if (currentQR.current_usage >= currentQR.max_capacity) {
                await storeQR(qrData, new Date(expiryTime).toISOString(), currentQRId, true);
              }
            }
          }
        } catch (error) {
          console.error('Error checking QR status:', error);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [venue?.id, currentQRId]);

  return (
    <View style={styles.container}>
      <Text style={styles.venueName}>{venue.name}</Text>
      <Text style={styles.capacity}>Capacity: {venue.capacity}</Text>
      
      {qrStats.isNew && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW QR CODE</Text>
        </View>
      )}
   
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
              logo={require('../assets/images/logo.png')}
              logoSize={40}
              logoMargin={2}
              logoBorderRadius={8}
              logoBackgroundColor="transparent"
            />
          </View>
          <Text style={styles.expiry}>Valid until: {expiryTime}</Text>
          <View style={styles.capacityInfo}>
            <Text style={[
              styles.capacityText,
              qrStats.remainingSlots === 0 && styles.fullText
            ]}>
              Usage: {qrStats.currentUsage}/{qrStats.maxCapacity}
            </Text>
            <Text style={[
              styles.capacityText,
              qrStats.remainingSlots === 0 && styles.fullText
            ]}>
              Remaining: {qrStats.remainingSlots} slots
            </Text>
            {qrStats.remainingSlots === 0 && (
              <Text style={styles.fullWarning}>
                This QR is full. A new one will be generated automatically.
              </Text>
            )}
          </View>
        </>
      ) : (
        <Text>No QR data available</Text>
      )}

      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={() => fetchQR(true)} // Force new QR generation
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
  newBadge: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 12,
    marginBottom: 10,
  },
  newBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
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
    marginBottom: 10,
  },
  capacityInfo: {
    marginBottom: 20,
    alignItems: 'center',
  },
  capacityText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  fullText: {
    color: 'red',
    fontWeight: 'bold',
  },
  fullWarning: {
    color: 'red',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginTop: 20,
  },
  refreshText: {
    marginLeft: 10,
    color: '#2e86de',
    fontSize: 16,
  },
  error: {
    color: 'red',
    marginVertical: 20,
  }
});


// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity, Button } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import QRCode from 'react-native-qrcode-svg';
// import api from '../services/api';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// export default function QrScreen({ route, navigation }) {
//   const [qrData, setQrData] = useState(null);
//   const [expiryTime, setExpiryTime] = useState('');
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [currentQRId, setCurrentQRId] = useState(null);
//   const [qrStats, setQrStats] = useState({
//     maxCapacity: 2,
//     currentUsage: 0,
//     remainingSlots: 2
//   });

//   if (!route?.params?.venue?.id) {
//     return (
//       <View style={styles.container}>
//         <Text style={styles.error}>Error: Invalid venue data</Text>
//         <Button 
//           title="Go Back" 
//           onPress={() => navigation.goBack()} 
//         />
//       </View>
//     );
//   }

//   const { venue } = route.params;

//   // Get stored QR data for this venue
//   const getStoredQR = async () => {
//     try {
//       const storedData = await AsyncStorage.getItem(`qr_${venue.id}`);
//       if (storedData) {
//         const { qrData, expiry, qrId } = JSON.parse(storedData);
//         if (new Date(expiry) > new Date()) {
//           return { qrData, expiry, qrId };
//         }
//       }
//       return null;
//     } catch (error) {
//       console.error('Error getting stored QR:', error);
//       return null;
//     }
//   };

//   // Store QR data for this venue
//   const storeQR = async (qrData, expiry, qrId) => {
//     try {
//       await AsyncStorage.setItem(`qr_${venue.id}`, JSON.stringify({
//         qrData,
//         expiry,
//         qrId
//       }));
//     } catch (error) {
//       console.error('Error storing QR:', error);
//     }
//   };

//   const fetchQR = async (forceNew = false) => {
//     try {
//       setIsLoading(true);
//       setError(null);
      
//       // Check if we have a valid stored QR code
//       if (!forceNew) {
//         const stored = await getStoredQR();
//         if (stored) {
//           setQrData(stored.qrData);
//           setExpiryTime(new Date(stored.expiry).toLocaleTimeString());
//           setCurrentQRId(stored.qrId);
//           setIsLoading(false);
//           return;
//         }
//       }

//       // Add validation for venue ID
//       if (!venue?.id || typeof venue.id !== 'string' || venue.id.trim() === '') {
//         throw new Error('Invalid venue information');
//       }

//       const response = await api.get('/admin/qr', {
//         params: { 
//           venue_id: venue.id.toString(),
//           force_new: forceNew
//         },
//         timeout: 24000
//       });
      
//       if (response.data?.qr_string) {
//         const expiry = new Date(response.data.expires_at);
        
//         setQrData(response.data.qr_string);
//         setExpiryTime(expiry.toLocaleTimeString());
//         setCurrentQRId(response.data.qr_id);
        
//         // Update stats if available from the response
//         if (response.data.max_capacity !== undefined && response.data.current_usage !== undefined) {
//           setQrStats({
//             maxCapacity: response.data.max_capacity,
//             currentUsage: response.data.current_usage,
//             remainingSlots: response.data.max_capacity - response.data.current_usage
//           });
//         }
        
//         // Store the new QR code
//         await storeQR(response.data.qr_string, expiry.toISOString(), response.data.qr_id);
//       } else {
//         throw new Error(response.data?.error || 'Invalid QR data received');
//       }
//     } catch (error) {
//       console.error('QR Generation Error:', error.message);
//       setError(error.message);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchQR();
//     return () => {
//       // Cleanup
//     };
//   }, [venue?.id]);

//   return (
//     <View style={styles.container}>
//       <Text style={styles.venueName}>{venue.name}</Text>
//       <Text style={styles.capacity}>Capacity: {venue.capacity}</Text>
   
//       {isLoading ? (
//         <Text>Loading QR code...</Text>
//       ) : error ? (
//         <Text style={styles.error}>Error: {error}</Text>
//       ) : qrData ? (
//         <>
//           <View style={styles.qrContainer}>
//             <QRCode
//               value={qrData}
//               size={250}
//               color="black"
//               backgroundColor="white"
//               logo={require('../assets/images/logo.png')}
//               logoSize={40}
//               logoMargin={2}
//               logoBorderRadius={8}
//               logoBackgroundColor="transparent"
//             />
//           </View>
//           <Text style={styles.expiry}>Valid until: {expiryTime}</Text>
//           <View style={styles.capacityInfo}>
//             <Text style={styles.capacityText}>
//               Usage: {qrStats.currentUsage}/{qrStats.maxCapacity}
//             </Text>
//             <Text style={styles.capacityText}>
//               Remaining: {qrStats.remainingSlots} slots
//             </Text>
//           </View>
//         </>
//       ) : (
//         <Text>No QR data available</Text>
//       )}

//       <TouchableOpacity 
//         style={styles.refreshButton}
//         onPress={() => fetchQR(true)} // Force new QR generation
//       >
//         <Icon name="refresh" size={24} color="#2e86de" />
//         <Text style={styles.refreshText}>Generate New QR</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     alignItems: 'center',
//     padding: 20,
//     backgroundColor: '#fff',
//   },
//   venueName: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     marginBottom: 5,
//   },
//   capacity: {
//     fontSize: 16,
//     color: '#666',
//     marginBottom: 20,
//   },
//   qrContainer: {
//     marginVertical: 20,
//     padding: 10,
//     borderWidth: 1,
//     borderColor: '#eee',
//   },
//   expiry: {
//     fontSize: 14,
//     color: '#888',
//     marginBottom: 10,
//   },
//   capacityInfo: {
//     marginBottom: 20,
//     alignItems: 'center',
//   },
//   capacityText: {
//     fontSize: 16,
//     color: '#555',
//     marginBottom: 5,
//   },
//   refreshButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 10,
//     marginTop: 20,
//   },
//   refreshText: {
//     marginLeft: 10,
//     color: '#2e86de',
//     fontSize: 16,
//   },
//   error: {
//     color: 'red',
//     marginVertical: 20,
//   }
// });