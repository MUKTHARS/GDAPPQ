import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PermissionsAndroid, Platform } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import auth from '../services/auth';
import api from '../services/api';

export default function QrScannerScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState(null);
  const camera = useRef(null);
  const device = useCameraDevice('back');
  const { hasPermission: cameraPermission, requestPermission } = useCameraPermission();

  const handleBarCodeScanned = async ({ nativeEvent }) => {
    if (!isActive) return;
    setIsActive(false);
    
    try {
      const authData = await auth.getAuthData();
      if (!authData.token) {
        throw new Error('Authentication required');
      }

      const response = await api.student.joinSession({ qr_data: nativeEvent.code });
      
      if (response.data.session_id) {
        navigation.navigate('GdSession', {
          sessionId: response.data.session_id,
        });
      } else {
        throw new Error('Invalid session ID received');
      }
    } catch (error) {
      console.error('QR Scan Error:', error);
      setError(error.response?.data?.error || error.message || 'Invalid QR code');
      setIsActive(true); // Allow scanning again after error
    }
  };

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
        isActive={isActive}
        onBarCodeScanned={handleBarCodeScanned}
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
// import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
// import { runOnJS } from 'react-native-reanimated';
// import auth from '../services/auth';
// import api from '../services/api';

// // QR Code scanning function
// function scanQRCode(frame) {
//   'worklet';
//   // This is a simplified QR code scanner - you might want to implement a proper one
//   // For production, consider using a proper QR scanning library or backend verification
//   const qrCode = frame.toString(); // Simplified - replace with actual scanning logic
//   return qrCode;
// }

// export default function QrScannerScreen({ navigation }) {
//   const [hasPermission, setHasPermission] = useState(false);
//   const [isActive, setIsActive] = useState(true);
//   const [error, setError] = useState(null);
//   const camera = useRef(null);
//   const device = useCameraDevice('back');
//   const { hasPermission: cameraPermission, requestPermission } = useCameraPermission();

//   const frameProcessor = useFrameProcessor((frame) => {
//     'worklet';
//     const qrCode = scanQRCode(frame);
//     if (qrCode) {
//       runOnJS(handleQRCodeDetected)(qrCode);
//     }
//   }, []);

//   const handleQRCodeDetected = async (qrData) => {
//     if (!isActive) return;
//     setIsActive(false);
    
//     try {
//       const authData = await auth.getAuthData();
//       if (!authData.token) {
//         throw new Error('Authentication required');
//       }

//       const response = await api.student.joinSession({ qr_data: qrData });
      
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
//         frameProcessor={frameProcessor}
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

// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, Button, PermissionsAndroid, Platform } from 'react-native';
// import QRCodeScanner from 'react-native-qrcode-scanner';
// import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
// import api from '../services/api';

// export default function QrScannerScreen({ navigation }) {
//   const [hasPermission, setHasPermission] = useState(null);
//   const [scanned, setScanned] = useState(false);

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
//         const status = await check(PERMISSIONS.IOS.CAMERA);
//         if (status !== RESULTS.GRANTED) {
//           const res = await request(PERMISSIONS.IOS.CAMERA);
//           setHasPermission(res === RESULTS.GRANTED);
//         } else {
//           setHasPermission(true);
//         }
//       }
//     };
//     requestCameraPermission();
//   }, []);

//   const onSuccess = async (e) => {
//     if (scanned) return;
//     setScanned(true);
//     try {
//       const response = await api.student.joinSession({ qr_data: e.data });
//       if (response.data.session_id) {
//         navigation.navigate('GdSession', {
//           sessionId: response.data.session_id,
//         });
//       }
//     } catch (error) {
//       alert(error.response?.data?.message || 'Invalid QR code or session full');
//       setScanned(false);
//     }
//   };

//   if (hasPermission === null) {
//     return (
//       <View style={styles.loading}>
//         <Text>Requesting camera permission...</Text>
//       </View>
//     );
//   }
//   if (hasPermission === false) {
//     return (
//       <View style={styles.loading}>
//         <Text>No access to camera</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       {!scanned && (
//         <QRCodeScanner
//           onRead={onSuccess}
//           fadeIn={true}
//           showMarker={true}
//           topContent={<Text style={styles.centerText}>Align QR code within the frame</Text>}
//           bottomContent={
//             <Text style={{ color: 'white', marginTop: 20 }}>
//               Point your camera at a QR code.
//             </Text>
//           }
//         />
//       )}

//       {scanned && (
//         <View style={styles.overlay}>
//           <Button title={'Tap to Scan Again'} onPress={() => setScanned(false)} />
//         </View>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   overlay: {
//     position: 'absolute',
//     bottom: 50,
//     alignSelf: 'center',
//     backgroundColor: 'rgba(0,0,0,0.7)',
//     padding: 20,
//     borderRadius: 10,
//   },
//   centerText: {
//     fontSize: 18,
//     padding: 32,
//     color: '#fff',
//     textAlign: 'center',
//   },
// });
