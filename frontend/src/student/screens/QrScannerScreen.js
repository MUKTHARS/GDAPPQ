import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PermissionsAndroid, Platform, Alert } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import auth from '../services/auth';
import api from '../services/api';
import { useIsFocused } from '@react-navigation/native';

export default function QrScannerScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState(null);
  const camera = useRef(null);
  const device = useCameraDevice('back');
  const { hasPermission: cameraPermission, requestPermission } = useCameraPermission();
  const isFocused = useIsFocused();

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
onCodeScanned: async (codes) => {
  if (codes.length > 0 && isActive && isFocused) {
    setIsActive(false);
    const qrData = codes[0].value;
    
    try {
      const authData = await auth.getAuthData();
      if (!authData?.token) {
        throw new Error('Authentication required - please login again');
      }

      const response = await api.student.joinSession({ qr_data: qrData });

      // Handle different error cases
      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      if (!response.data?.session_id) {
        throw new Error('Session information not found in response');
      }

      navigation.navigate('GdSession', { 
        sessionId: response.data.session_id 
      });
      
    } catch (error) {
      console.error('QR Scan Error:', error);
      setError(error.message || 'Failed to join session');
      setIsActive(true);
      
      // Show appropriate alert
      Alert.alert(
        'Session Error',
        error.message || 'Failed to join session',
        [
          { 
            text: 'OK', 
            onPress: () => {
              if (error.message.includes('Authentication')) {
                navigation.navigate('Login');
              } else {
                setIsActive(true);
              }
            }
          }
        ]
      );
    }
  }
}
// onCodeScanned: async (codes) => {
//   if (codes.length > 0 && isActive && isFocused) {
//     setIsActive(false);
//     const qrData = codes[0].value;
    
//     try {
//       const authData = await auth.getAuthData();
//       if (!authData?.token) {
//         throw new Error('Authentication required - please login again');
//       }

//       const response = await api.student.joinSession({ qr_data: qrData });

//       // Handle 401 Unauthorized specifically
//       if (response.status === 401) {
//         throw new Error(response.data?.error || 'Invalid or expired QR code');
//       }

//       // Handle case where session ID might be in different field
//       const sessionId = response.data?.session_id || 
//                        response.data?.id || 
//                        response.data?.data?.session_id;

//       if (!sessionId) {
//         throw new Error('Session information not found in response');
//       }

//       navigation.navigate('GdSession', { sessionId });
      
//     } catch (error) {
//       console.error('QR Scan Error:', error);
//       setError(error.message || 'Failed to join session');
//       setIsActive(true);
      
//       // Handle 401 by prompting re-login
//       if (error.message.includes('Invalid or expired QR code') || 
//           error.response?.status === 401) {
//         Alert.alert(
//           'Session Error',
//           'The QR code is invalid or expired. Please try again or contact support.',
//           [
//             { text: 'OK', onPress: () => navigation.goBack() }
//           ]
//         );
//       }
//     }
//   }
// }

//     onCodeScanned: async (codes) => {
//   if (codes.length > 0 && isActive && isFocused) {
//     setIsActive(false);
//     const qrData = codes[0].value;
    
//     try {
//       // Get auth data including the JWT token
//       const authData = await auth.getAuthData();
//       if (!authData?.token) {
//         throw new Error('Authentication required - please login again');
//       }

//       // Make the API request with proper error handling
//       const response = await api.student.joinSession({ 
//         qr_data: qrData 
//       });

//       // Check for 400 status specifically
//       if (response.status === 400) {
//         throw new Error(response.data?.error || 'Invalid QR code or session data');
//       }

//       if (!response.data?.session_id) {
//         throw new Error('Invalid session ID received from server');
//       }
      
//       navigation.navigate('GdSession', {
//         sessionId: response.data.session_id,
//       });
//     } catch (error) {
//       console.error('QR Scan Error:', error);
      
//       let errorMessage = 'Failed to join session';
//       if (error.response) {
//         // Handle specific error statuses
//         if (error.response.status === 400) {
//           errorMessage = error.response.data?.error || 'Invalid QR code';
//         } else if (error.response.status === 401) {
//           errorMessage = 'Session expired - please login again';
//         } else if (error.response.status === 403) {
//           errorMessage = 'You need to book this venue first';
//         }
//       } else if (error.message) {
//         errorMessage = error.message;
//       }
      
//       setError(errorMessage);
//       setIsActive(true); // Allow scanning again after error
      
//       // Show alert for important errors
//       if (error.response?.status === 401) {
//         Alert.alert('Session Expired', errorMessage, [
//           { text: 'OK', onPress: () => navigation.navigate('Login') }
//         ]);
//       }
//     }
//   }
// }
    // onCodeScanned: async (codes) => {
    //   if (codes.length > 0 && isActive && isFocused) {
    //     setIsActive(false);
    //     const qrData = codes[0].value;
        
    //     try {
    //       // Get auth data including the JWT token
    //       const authData = await auth.getAuthData();
    //       if (!authData?.token) {
    //         throw new Error('Authentication required - please login again');
    //       }

    //       // Make sure to send the QR data in the correct format
    //       const response = await api.student.joinSession({ 
    //         qr_data: qrData 
    //       }, {
    //         headers: {
    //           'Authorization': `Bearer ${authData.token}`
    //         }
    //       });
          
    //       if (response.data?.session_id) {
    //         navigation.navigate('GdSession', {
    //           sessionId: response.data.session_id,
    //         });
    //       } else {
    //         throw new Error('Invalid session ID received from server');
    //       }
    //     } catch (error) {
    //       console.error('QR Scan Error:', error);
          
    //       let errorMessage = 'Failed to join session';
    //       if (error.response) {
    //         // Handle 400 Bad Request specifically
    //         if (error.response.status === 400) {
    //           errorMessage = error.response.data?.error || 'Invalid QR code or session data';
    //         } else if (error.response.status === 401) {
    //           errorMessage = 'Session expired - please login again';
    //         }
    //       }
          
    //       setError(errorMessage);
    //       setIsActive(true); // Allow scanning again after error
          
    //       // Show alert for important errors
    //       if (error.response?.status === 401) {
    //         Alert.alert('Session Expired', errorMessage, [
    //           { text: 'OK', onPress: () => navigation.navigate('Login') }
    //         ]);
    //       }
    //     }
    //   }
    // }
  });

  useEffect(() => {
    const requestCameraPermission = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "App needs access to your camera",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        if (!cameraPermission) {
          const permission = await requestPermission();
          setHasPermission(permission);
        } else {
          setHasPermission(true);
        }
      }
    };
    requestCameraPermission();
  }, [cameraPermission]);

  if (!hasPermission) {
    return (
      <View style={styles.loading}>
        <Text>Camera permission not granted</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.loading}>
        <Text>Camera device not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive && isFocused}
        codeScanner={codeScanner}
        torch={'off'}
        zoom={1}
      />

      <View style={styles.overlay}>
        <View style={styles.border} />
        <Text style={styles.instructionText}>
          Align QR code within the frame
        </Text>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setError(null);
                setIsActive(true);
              }}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  border: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'black',
    fontWeight: 'bold',
  },
});


// import React, { useState, useEffect, useRef } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity, PermissionsAndroid, Platform } from 'react-native';
// import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
// import auth from '../services/auth';
// import api from '../services/api';

// export default function QrScannerScreen({ navigation }) {
//   const [hasPermission, setHasPermission] = useState(false);
//   const [isActive, setIsActive] = useState(true);
//   const [error, setError] = useState(null);
//   const camera = useRef(null);
//   const device = useCameraDevice('back');
//   const { hasPermission: cameraPermission, requestPermission } = useCameraPermission();

//   const handleBarCodeScanned = async ({ nativeEvent }) => {
//     if (!isActive) return;
//     setIsActive(false);
    
//     try {
//       const authData = await auth.getAuthData();
//       if (!authData.token) {
//         throw new Error('Authentication required');
//       }

//       const response = await api.student.joinSession({ qr_data: nativeEvent.code });
      
//       if (response.data.session_id) {
//         navigation.navigate('GdSession', {
//           sessionId: response.data.session_id,
//         });
//       } else {
//         throw new Error('Invalid session ID received');
//       }
//     } catch (error) {
//       console.error('QR Scan Error:', error);
//       setError(error.response?.data?.error || error.message || 'Invalid QR code');
//       setIsActive(true); // Allow scanning again after error
//     }
//   };

//   useEffect(() => {
//     const requestCameraPermission = async () => {
//       if (Platform.OS === 'android') {
//         const granted = await PermissionsAndroid.request(
//           PermissionsAndroid.PERMISSIONS.CAMERA,
//           {
//             title: "Camera Permission",
//             message: "App needs access to your camera",
//             buttonNeutral: "Ask Me Later",
//             buttonNegative: "Cancel",
//             buttonPositive: "OK"
//           }
//         );
//         setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
//       } else {
//         if (!cameraPermission) {
//           const permission = await requestPermission();
//           setHasPermission(permission);
//         } else {
//           setHasPermission(true);
//         }
//       }
//     };
//     requestCameraPermission();
//   }, [cameraPermission]);

//   if (!hasPermission) {
//     return (
//       <View style={styles.loading}>
//         <Text>Camera permission not granted</Text>
//       </View>
//     );
//   }

//   if (!device) {
//     return (
//       <View style={styles.loading}>
//         <Text>Camera device not found</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <Camera
//         ref={camera}
//         style={StyleSheet.absoluteFill}
//         device={device}
//         isActive={isActive}
//         onBarCodeScanned={handleBarCodeScanned}
//         torch={'off'}
//         zoom={1}
//       />

//       <View style={styles.overlay}>
//         <View style={styles.border} />
//         <Text style={styles.instructionText}>
//           Align QR code within the frame
//         </Text>
//         {error && (
//           <View style={styles.errorContainer}>
//             <Text style={styles.errorText}>{error}</Text>
//             <TouchableOpacity
//               style={styles.retryButton}
//               onPress={() => {
//                 setError(null);
//                 setIsActive(true);
//               }}
//             >
//               <Text style={styles.retryButtonText}>Try Again</Text>
//             </TouchableOpacity>
//           </View>
//         )}
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: 'black',
//   },
//   loading: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'white',
//   },
//   overlay: {
//     ...StyleSheet.absoluteFillObject,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   border: {
//     width: 250,
//     height: 250,
//     borderWidth: 2,
//     borderColor: 'white',
//     borderRadius: 10,
//     backgroundColor: 'transparent',
//   },
//   instructionText: {
//     color: 'white',
//     fontSize: 16,
//     marginTop: 20,
//     textAlign: 'center',
//     paddingHorizontal: 20,
//   },
//   errorContainer: {
//     backgroundColor: 'rgba(0,0,0,0.7)',
//     padding: 20,
//     borderRadius: 10,
//     marginTop: 20,
//     alignItems: 'center',
//   },
//   errorText: {
//     color: 'red',
//     fontSize: 16,
//     textAlign: 'center',
//     marginBottom: 10,
//   },
//   retryButton: {
//     backgroundColor: 'white',
//     padding: 10,
//     borderRadius: 5,
//   },
//   retryButtonText: {
//     color: 'black',
//     fontWeight: 'bold',
//   },
// });

