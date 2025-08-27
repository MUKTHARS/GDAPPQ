import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Text, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { CommonActions } from '@react-navigation/native';
import auth from '../services/auth';

const IconMenuModal = ({ visible, onClose, navigation }) => {
  const menuItems = [
    { name: 'SessionBooking', icon: 'home', label: 'Home' },
    { name: 'QrScanner', icon: 'qr-code-scanner', label: 'Scan QR' },
   { name: 'Profile', icon: 'person', label: 'Profile' },
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
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#4F46E5', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.menuItemGradient}
              >
                <Icon name={item.icon} size={24} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          ))}
          
          <View style={styles.divider} />
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#DC2626', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.menuItemGradient}
            >
              <Icon name="exit-to-app" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingLeft: 15,
  },
  menuContainer: {
    backgroundColor: '#090d13ff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  menuItem: {
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  menuItemGradient: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  divider: {
    height: 1,
    width: '80%',
    backgroundColor: '#334155',
    marginVertical: 12,
    borderRadius: 0.5,
  },
});

export default IconMenuModal;
