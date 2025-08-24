import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
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
        <LinearGradient
          colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
          style={styles.menuContainer}
        >
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={styles.menuItem}
              onPress={() => handleNavigation(item.name)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.menuItemGradient}
              >
                <Icon name={item.icon} size={24} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          ))}
          
          <LinearGradient
            colors={['rgba(224, 224, 224, 0.6)', 'rgba(224, 224, 224, 0.3)']}
            style={styles.divider}
          />
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#ff6b6b', '#ee5a52']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.menuItemGradient}
            >
              <Icon name="exit-to-app" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(102, 126, 234, 0.4)',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingLeft: 15,
  },
  menuContainer: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  menuItem: {
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
    marginVertical: 12,
    borderRadius: 0.5,
  },
});

export default IconMenuModal; 



// // C:\xampp\htdocs\GDAPPC\frontend\src\student\components\IconMenuModal.js
// import React from 'react';
// import { View, StyleSheet, TouchableOpacity, Modal, Text } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import { colors } from '../assets/globalStyles';
// import { CommonActions } from '@react-navigation/native';
// import auth from '../services/auth';

// const IconMenuModal = ({ visible, onClose, navigation }) => {
//   const menuItems = [
//     { name: 'SessionBooking', icon: 'home', label: 'Home' },
//     { name: 'QrScanner', icon: 'qr-code-scanner', label: 'Scan QR' },
//   ];

//   const handleNavigation = (screenName) => {
//     navigation.navigate(screenName);
//     onClose();
//   };

//   const handleLogout = async () => {
//     try {
//       await auth.logout();
//       navigation.dispatch(
//         CommonActions.reset({
//           index: 0,
//           routes: [{ name: 'Login' }],
//         })
//       );
//     } catch (error) {
//       console.error('Logout failed:', error);
//       Alert.alert('Error', 'Failed to logout');
//     }
//   };

//   return (
//     <Modal
//       transparent={true}
//       visible={visible}
//       animationType="fade"
//       onRequestClose={onClose}
//     >
//       <TouchableOpacity 
//         style={styles.modalOverlay} 
//         activeOpacity={1}
//         onPress={onClose}
//       >
//         <View style={styles.menuContainer}>
//           {menuItems.map((item) => (
//             <TouchableOpacity
//               key={item.name}
//               style={styles.menuItem}
//               onPress={() => handleNavigation(item.name)}
//             >
//               <Icon name={item.icon} size={28} color={colors.primary} />
//             </TouchableOpacity>
//           ))}
          
//           <View style={styles.divider} />
          
//           <TouchableOpacity 
//             style={styles.menuItem}
//             onPress={handleLogout}
//           >
//             <Icon name="exit-to-app" size={28} color={colors.danger} />
//           </TouchableOpacity>
//         </View>
//       </TouchableOpacity>
//     </Modal>
//   );
// };

// const styles = StyleSheet.create({
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     alignItems: 'flex-end',
//     justifyContent: 'flex-start',
//     paddingTop: 60,
//     paddingRight: 10,
//   },
//   menuContainer: {
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     padding: 10,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 4,
//     elevation: 5,
//   },
//   menuItem: {
//     padding: 12,
//     marginVertical: 5,
//     borderRadius: 8,
//     backgroundColor: '#f8f9fa',
//     width: 50,
//     height: 50,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   divider: {
//     height: 1,
//     backgroundColor: '#e0e0e0',
//     width: '100%',
//     marginVertical: 8,
//   },
// });

// export default IconMenuModal;
