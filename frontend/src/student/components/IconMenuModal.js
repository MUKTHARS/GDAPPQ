// C:\xampp\htdocs\GDAPPC\frontend\src\student\components\IconMenuModal.js
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../assets/globalStyles';
import { CommonActions } from '@react-navigation/native';
import auth from '../services/auth';

const IconMenuModal = ({ visible, onClose, navigation }) => {
  const menuItems = [
    { name: 'SessionBooking', icon: 'home', label: 'Home' },
    { name: 'QrScanner', icon: 'qr-code-scanner', label: 'Scan QR' },
  ];

  const handleNavigation = (screenName) => {
    navigation.navigate(screenName);
    onClose();
  };

  const handleLogout = async () => {
    try {
      await auth.logout();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })
      );
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={styles.menuItem}
              onPress={() => handleNavigation(item.name)}
            >
              <Icon name={item.icon} size={28} color={colors.primary} />
            </TouchableOpacity>
          ))}
          
          <View style={styles.divider} />
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleLogout}
          >
            <Icon name="exit-to-app" size={28} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingRight: 10,
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    padding: 12,
    marginVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    width: '100%',
    marginVertical: 8,
  },
});

export default IconMenuModal;