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
        colors={['#667eea', '#764ba2']}
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
// import { colors } from '../assets/globalStyles';

// const HamburgerHeader = ({ title, showMenu = true }) => {
//   const navigation = useNavigation();
//   const [menuVisible, setMenuVisible] = useState(false);

//   return (
//     <View style={styles.container}>
//       <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
//       <View style={styles.header}>
//         {showMenu && (
//           <TouchableOpacity 
//             onPress={() => setMenuVisible(true)}
//             style={styles.menuButton}
//             hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
//           >
//             <Icon name="menu" size={24} color={colors.white} />
//           </TouchableOpacity>
//         )}
        
//         <Text style={styles.title}>{title}</Text>
        
//         {/* Empty view for balance when menu is hidden */}
//         {!showMenu && <View style={styles.menuButton} />}
//       </View>

//       <IconMenuModal 
//         visible={menuVisible} 
//         onClose={() => setMenuVisible(false)}
//         navigation={navigation}
//       />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     backgroundColor: colors.primary,
//     paddingTop: StatusBar.currentHeight,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 5,
//     zIndex: 100,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     height: 56,
//     paddingHorizontal: 16,
//   },
//   menuButton: {
//     padding: 8,
//     width: 40,
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: '600',
//     color: colors.white,
//     textAlign: 'center',
//     flex: 1,
//   },
// });

// export default HamburgerHeader;

// // // src/student/components/HamburgerHeader.js
// // import React, { useState } from 'react';
// // import { View, StyleSheet, TouchableOpacity, Text, StatusBar } from 'react-native';
// // import Icon from 'react-native-vector-icons/MaterialIcons';
// // import { useNavigation } from '@react-navigation/native';
// // import MenuModal from './MenuModal';
// // import { globalStyles, colors } from '../assets/globalStyles';

// // const HamburgerHeader = ({ title }) => {
// //   const navigation = useNavigation();
// //   const [menuVisible, setMenuVisible] = useState(false);

// //   return (
// //     <View style={styles.container}>
// //       <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
// //       <View style={styles.header}>
// //         <TouchableOpacity 
// //           onPress={() => setMenuVisible(true)}
// //           style={styles.menuButton}
// //           hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
// //         >
// //           <Icon name="menu" size={24} color={colors.white} />
// //         </TouchableOpacity>
        
// //         <Text style={styles.title}>{title}</Text>
        
// //         {/* Empty view for balance */}
// //         <View style={styles.rightPlaceholder} />
// //       </View>

// //       <MenuModal 
// //         visible={menuVisible} 
// //         onClose={() => setMenuVisible(false)}
// //         navigation={navigation}
// //       />
// //     </View>
// //   );
// // };

// // const styles = StyleSheet.create({
// //   container: {
// //     backgroundColor: colors.primary,
// //     paddingTop: StatusBar.currentHeight,
// //     shadowColor: '#000',
// //     shadowOffset: { width: 0, height: 2 },
// //     shadowOpacity: 0.1,
// //     shadowRadius: 4,
// //     elevation: 5,
// //     zIndex: 100,
// //   },
// //   header: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     justifyContent: 'space-between',
// //     height: 56,
// //     paddingHorizontal: 16,
// //   },
// //   menuButton: {
// //     padding: 8,
// //   },
// //   title: {
// //     fontSize: 20,
// //     fontWeight: '600',
// //     color: colors.white,
// //     textAlign: 'center',
// //     flex: 1,
// //     marginHorizontal: 12,
// //   },
// //   rightPlaceholder: {
// //     width: 32, 
// //   },
// // });

// // export default HamburgerHeader;
