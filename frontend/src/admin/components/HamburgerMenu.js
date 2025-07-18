// frontend/src/admin/components/HamburgerMenu.js
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const HamburgerMenu = ({ navigation }) => {
  const menuItems = [
    { title: 'Dashboard', icon: 'dashboard', screen: 'Dashboard' },
    { title: 'Session Calendar', icon: 'calendar-today', screen: 'SessionCalendar' },
    { title: 'Student Progress', icon: 'school', screen: 'StudentProgress' },
    { title: 'Question Bank', icon: 'help-outline', screen: 'QuestionBank' },
    { title: 'Venue Management', icon: 'meeting-room', screen: 'VenueSetup' },
    { title: 'Session Rules', icon: 'rule', screen: 'SessionRules' },
    { title: 'Analytics', icon: 'analytics', screen: 'Analytics' },
    { title: 'Bulk Sessions', icon: 'post-add', screen: 'BulkSessions' },
    { title: 'Logout', icon: 'logout', screen: 'Login' },
  ];

  return (
    <View style={styles.container}>
      {menuItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.menuItem}
          onPress={() => navigation.navigate(item.screen)}
        >
          <Icon name={item.icon} size={24} color="#2e86de" />
          <Text style={styles.menuText}>{item.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  menuText: {
    marginLeft: 20,
    fontSize: 16,
  },
});

export default HamburgerMenu;