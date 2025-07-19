import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, PermissionsAndroid, Platform } from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import api from '../services/api';

export default function QrScannerScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

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
        const status = await check(PERMISSIONS.IOS.CAMERA);
        if (status !== RESULTS.GRANTED) {
          const res = await request(PERMISSIONS.IOS.CAMERA);
          setHasPermission(res === RESULTS.GRANTED);
        } else {
          setHasPermission(true);
        }
      }
    };
    requestCameraPermission();
  }, []);

  const onSuccess = async (e) => {
    if (scanned) return;
    setScanned(true);
    try {
      const response = await api.student.joinSession({ qr_data: e.data });
      if (response.data.session_id) {
        navigation.navigate('GdSession', {
          sessionId: response.data.session_id,
        });
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Invalid QR code or session full');
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loading}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.loading}>
        <Text>No access to camera</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!scanned && (
        <QRCodeScanner
          onRead={onSuccess}
          fadeIn={true}
          showMarker={true}
          topContent={<Text style={styles.centerText}>Align QR code within the frame</Text>}
          bottomContent={
            <Text style={{ color: 'white', marginTop: 20 }}>
              Point your camera at a QR code.
            </Text>
          }
        />
      )}

      {scanned && (
        <View style={styles.overlay}>
          <Button title={'Tap to Scan Again'} onPress={() => setScanned(false)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    borderRadius: 10,
  },
  centerText: {
    fontSize: 18,
    padding: 32,
    color: '#fff',
    textAlign: 'center',
  },
});
