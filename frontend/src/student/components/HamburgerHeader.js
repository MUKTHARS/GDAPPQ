import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import IconMenuModal from './IconMenuModal';

const HamburgerHeader = ({ title, showMenu = true }) => {
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#667eea" barStyle="light-content" />
      <LinearGradient
       colors={['#667eea', '#667eea', '#667eea']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          {showMenu && (
            <TouchableOpacity 
              onPress={() => setMenuVisible(true)}
              style={styles.menuButton}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={styles.menuButtonGradient}
              >
                <Icon name="menu" size={22} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.titleUnderline} />
          </View>
          
          {/* Empty view for balance when menu is hidden */}
          {!showMenu && <View style={styles.menuButton} />}
        </View>

        {/* Decorative bottom border */}
        <LinearGradient
          colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bottomBorder}
        />
      </LinearGradient>

      <IconMenuModal 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)}
        navigation={navigation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 100,
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  menuButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  titleUnderline: {
    width: 30,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    borderRadius: 1,
  },
  bottomBorder: {
    height: 1,
    width: '100%',
  },
});

export default HamburgerHeader;

// import React, { useState } from 'react';
// import { View, StyleSheet, TouchableOpacity, Text, StatusBar } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import { useNavigation } from '@react-navigation/native';
// import IconMenuModal from './IconMenuModal';

// const HamburgerHeader = ({ title, showMenu = true }) => {
//   const navigation = useNavigation();
//   const [menuVisible, setMenuVisible] = useState(false);

//   return (
//     <View style={styles.container}>
//       <StatusBar backgroundColor="#030508ff" barStyle="light-content" translucent={true}/>
//       <View style={styles.header}>
//         <View style={styles.headerContent}>
//           {showMenu && (
//             <TouchableOpacity 
//               onPress={() => setMenuVisible(true)}
//               style={styles.menuButton}
//               hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
//               activeOpacity={0.7}
//             >
//               <Icon name="menu" size={22} color="#F8FAFC" />
//             </TouchableOpacity>
//           )}
          
//           <View style={styles.titleContainer}>
//             <Text style={styles.title}>{title}</Text>
//           </View>
          
//           {/* Empty view for balance when menu is hidden */}
//           {!showMenu && <View style={styles.menuButton} />}
//         </View>
        
//         {/* Bottom border */}
//         <View style={styles.bottomBorder} />
//       </View>

//       <IconMenuModal 
//         visible={menuVisible} 
//         onClose={() => setMenuVisible(false)}
//         navigation={navigation}
//       />
//     </View>
//   );
// };

// // Replace the existing styles object with this updated one:

// const styles = StyleSheet.create({
//   container: {
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 8,
//     elevation: 8,
//     zIndex: 100,
//   },
//   header: {
//     backgroundColor: '#0a0f1bff', // Changed to match SessionBooking background
//     paddingTop: StatusBar.currentHeight || 0,
//   },
//   headerContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     height: 64,
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//   },
//   menuButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 10,
//     backgroundColor: '#1E293B', // Changed to match SessionBooking card colors
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#334155',
//   },
//   titleContainer: {
//     flex: 1,
//     alignItems: 'center',
//     paddingHorizontal: 16,
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: '800',
//     color: '#F8FAFC',
//     textAlign: 'center',
//     letterSpacing: 0.3,
//     textTransform: 'uppercase',
//   },
//   bottomBorder: {
//     height: 1,
//     backgroundColor: '#334155', // Changed to match the dark theme
//     marginHorizontal: 20,
//   },
// });

// export default HamburgerHeader;
