import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PermissionsAndroid, Platform, Alert } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import auth from '../services/auth';
import api from '../services/api';
import { useIsFocused } from '@react-navigation/native';
import HamburgerHeader from '../components/HamburgerHeader';

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

                    if (response?.data?.error) {
                        throw new Error(response.data.error);
                    }

                    if (!response?.data?.session_id) {
                        throw new Error('Failed to join session - invalid response');
                    }

                    // Navigate to lobby instead of directly to session
                    navigation.navigate('Lobby', { 
                        sessionId: response.data.session_id 
                    });
                    
                } catch (error) {
                    console.error('QR Scan Error:', error);
                    setIsActive(true);
                    Alert.alert(
                        'Session Error',
                        error.message || 'Failed to join session',
                        [{ 
                            text: 'OK', 
                            onPress: () => setIsActive(true)
                        }]
                    );
                }
            }
        }

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
      {/* <HamburgerHeader title="Scan QR Code" /> */}
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
