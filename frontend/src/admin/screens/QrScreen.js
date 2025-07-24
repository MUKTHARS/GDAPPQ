import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Button } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import QRCode from 'react-native-qrcode-svg';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logoImage from '../assets/images/logo.png';

export default function QrScreen({ route, navigation }) {
  const [qrData, setQrData] = useState(null);
  const [expiryTime, setExpiryTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentQRId, setCurrentQRId] = useState(null);
  
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
        const { qrData, expiry, qrId } = JSON.parse(storedData);
        if (new Date(expiry) > new Date()) {
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
  const storeQR = async (qrData, expiry, qrId) => {
    try {
      await AsyncStorage.setItem(`qr_${venue.id}`, JSON.stringify({
        qrData,
        expiry,
        qrId
      }));
    } catch (error) {
      console.error('Error storing QR:', error);
    }
  };

  const fetchQR = async (forceNew = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if we have a valid stored QR code
      if (!forceNew) {
        const stored = await getStoredQR();
        if (stored) {
          setQrData(stored.qrData);
          setExpiryTime(new Date(stored.expiry).toLocaleTimeString());
          setCurrentQRId(stored.qrId);
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
        timeout: 15000
      });
      
      if (response.data?.qr_string) {
        const expiry = new Date(response.data.expires_at);
        
        setQrData(response.data.qr_string);
        setExpiryTime(expiry.toLocaleTimeString());
        setCurrentQRId(response.data.qr_id);
        
        // Store the new QR code
        await storeQR(response.data.qr_string, expiry.toISOString(), response.data.qr_id);
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

  useEffect(() => {
    fetchQR();
    return () => {
      // Cleanup
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
              logo={require('../assets/images/logo.png')}
              logoSize={40}
              logoMargin={2}
              logoBorderRadius={8}
              logoBackgroundColor="transparent"
            />
          </View>
          <Text style={styles.expiry}>Valid until: {expiryTime}</Text>
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

// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity, Button } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import QRCode from 'react-native-qrcode-svg';
// import api from '../services/api';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import logoImage from '../assets/images/logo.png';

// export default function QrScreen({ route, navigation }) {
//   const [qrData, setQrData] = useState(null);
//   const [expiryTime, setExpiryTime] = useState('');
//   const [retryCount, setRetryCount] = useState(0);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);
  
//   // Add this check at the start before any other code
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
//         const { qrData, expiry } = JSON.parse(storedData);
//         if (new Date(expiry) > new Date()) {
//           return { qrData, expiry };
//         }
//       }
//       return null;
//     } catch (error) {
//       console.error('Error getting stored QR:', error);
//       return null;
//     }
//   };

//   // Store QR data for this venue
//   const storeQR = async (qrData, expiry) => {
//     try {
//       await AsyncStorage.setItem(`qr_${venue.id}`, JSON.stringify({
//         qrData,
//         expiry
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
//           setIsLoading(false);
//           return;
//         }
//       }

//       // Add validation for venue ID
//       if (!venue?.id || typeof venue.id !== 'string' || venue.id.trim() === '') {
//         throw new Error('Invalid venue information');
//       }

//       const response = await api.get('/admin/qr', {
//         params: { venue_id: venue.id.toString() },
//         timeout: 15000
//       });
      
//       if (response.data?.qr_string) {
//         const expiry = new Date();
//         expiry.setMinutes(expiry.getMinutes() + 15);
        
//         setQrData(response.data.qr_string);
//         setExpiryTime(expiry.toLocaleTimeString());
//         setRetryCount(0); // Reset retry count on success
        
//         // Store the new QR code
//         await storeQR(response.data.qr_string, expiry.toISOString());
//       } else {
//         throw new Error(response.data?.error || 'Invalid QR data received');
//       }
//     } catch (error) {
//       console.error('QR Generation Error:', error.message);
//       setError(error.message);
      
//       // Only retry if it's a network error and we haven't exceeded max retries
//       if (retryCount < 3 && error.message !== 'Invalid venue information') {
//         const delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
//         setTimeout(() => {
//           setRetryCount(c => c + 1);
//           fetchQR();
//         }, delay);
//       }
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchQR();
//     return () => {
//       // Cleanup any pending retries
//       setRetryCount(0);
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
//            <QRCode
//              value={qrData}
//              size={250}
//              color="black"
//              backgroundColor="white"
//              logo={require('../assets/images/logo.png')}
//              logoSize={40}
//              logoMargin={2}
//              logoBorderRadius={8}
//              logoBackgroundColor="transparent"
//            />
//           </View>
//           <Text style={styles.expiry}>Valid until: {expiryTime}</Text>
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

// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity, Button } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import QRCode from 'react-native-qrcode-svg';
// import api from '../services/api';
// import logoImage from '../assets/images/logo.png';

// export default function QrScreen({ route, navigation }) {
//   const [qrData, setQrData] = useState(null);
//   const [expiryTime, setExpiryTime] = useState('');
//   const [retryCount, setRetryCount] = useState(0);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);
  
//   // Add this check at the start before any other code
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
// const fetchQR = async () => {
//   try {
//     setIsLoading(true);
//     setError(null);
    
//     if (!venue?.id || typeof venue.id !== 'string' || venue.id.trim() === '') {
//       throw new Error('Invalid venue information');
//     }

//     const response = await api.get('/admin/qr', {
//       params: { venue_id: venue.id.toString() },
//       timeout: 15000
//     });
    
//     if (response.data?.qr_string) {
//       setQrData(response.data.qr_string);
//       const expiry = response.data.expires_at 
//         ? new Date(response.data.expires_at) 
//         : new Date(Date.now() + (response.data.expires_in || 15) * 60000);
//       setExpiryTime(expiry.toLocaleTimeString());
//       setRetryCount(0);
//     } else {
//       throw new Error(response.data?.error || 'Invalid QR data received');
//     }
//   } catch (error) {
//     console.error('QR Generation Error:', error.message);
//     setError(error.message);
    
//     if (retryCount < 3 && error.message !== 'Invalid venue information') {
//       const delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
//       setTimeout(() => {
//         setRetryCount(c => c + 1);
//         fetchQR();
//       }, delay);
//     }
//   } finally {
//     setIsLoading(false);
//   }
// };
//   // const fetchQR = async () => {
//   //   try {
//   //     setIsLoading(true);
//   //     setError(null);
      
//   //     // Add validation for venue ID
//   //     if (!venue?.id || typeof venue.id !== 'string' || venue.id.trim() === '') {
//   //       throw new Error('Invalid venue information');
//   //     }

//   //     const response = await api.get('/admin/qr', {
//   //       params: { venue_id: venue.id.toString() },
//   //       timeout: 15000
//   //     });
      
//   //     if (response.data?.qr_string) {
//   //       setQrData(response.data.qr_string);
//   //       const expiry = new Date();
//   //       expiry.setMinutes(expiry.getMinutes() + 15);
//   //       setExpiryTime(expiry.toLocaleTimeString());
//   //       setRetryCount(0); // Reset retry count on success
//   //     } else {
//   //       throw new Error(response.data?.error || 'Invalid QR data received');
//   //     }
//   //   } catch (error) {
//   //     console.error('QR Generation Error:', error.message);
//   //     setError(error.message);
      
//   //     // Only retry if it's a network error and we haven't exceeded max retries
//   //     if (retryCount < 3 && error.message !== 'Invalid venue information') {
//   //       const delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
//   //       setTimeout(() => {
//   //         setRetryCount(c => c + 1);
//   //         fetchQR();
//   //       }, delay);
//   //     }
//   //   } finally {
//   //     setIsLoading(false);
//   //   }
//   // };

//   useEffect(() => {
//     fetchQR();
//     return () => {
//       // Cleanup any pending retries
//       setRetryCount(0);
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
//            <QRCode
//              value={qrData}
//              size={250}
//              color="black"
//              backgroundColor="white"
//              logo={require('../assets/images/logo.png')}
//              logoSize={40}
//              logoMargin={2}
//              logoBorderRadius={8}
//              logoBackgroundColor="transparent"
//            />
//           </View>
//           <Text style={styles.expiry}>Valid until: {expiryTime}</Text>
//         </>
//       ) : (
//         <Text>No QR data available</Text>
//       )}

//       <TouchableOpacity 
//         style={styles.refreshButton}
//         onPress={fetchQR}
//       >
//         <Icon name="refresh" size={24} color="#2e86de" />
//         <Text style={styles.refreshText}>Generate New QR</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

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