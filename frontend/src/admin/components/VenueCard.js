// components/VenueCard.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button } from 'react-native';
import InlineEditText from './InlineEditText';
import Icon from 'react-native-vector-icons/MaterialIcons';
const VenueCard = ({ venue, onEdit, onGenerateQR }) => {
  return (
    <View style={styles.card}>
  <View style={styles.rowContainer}>
    <View style={{ flex: 1 }}>
      <Text style={styles.venueName}>{venue.name}</Text>
      <Text>Capacity: {venue.capacity}</Text>
    </View>

    <View style={styles.iconContainer}>
      <TouchableOpacity 
        onPress={() => onEdit(venue)}
        style={styles.iconButton}
      >
        <Icon name="edit" size={24} color="#007AFF" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => onGenerateQR(venue.id)}
        style={styles.iconButton}
      >
        <Icon name="qr-code" size={24} color="#007AFF" />
      </TouchableOpacity>
    </View>
  </View>
</View>

  );
};

// const VenueCard = ({ venue, onEdit, onGenerateQR }) => {
//   const [currentVenue, setCurrentVenue] = useState(venue);

//   const handleSaveName = (newName) => {
//     const updatedVenue = { ...currentVenue, name: newName };
//     setCurrentVenue(updatedVenue);
//     onEdit(updatedVenue); // This calls the existing onEdit prop
//   };

//   const handleSaveCapacity = (newCapacity) => {
//     const updatedVenue = { ...currentVenue, capacity: parseInt(newCapacity) || 0 };
//     setCurrentVenue(updatedVenue);
//     onEdit(updatedVenue); // This calls the existing onEdit prop
//   };

//   return (
//     <View style={styles.card}>
//       <InlineEditText
//         value={currentVenue.name}
//         onSave={handleSaveName}
//         style={styles.name}
//       />
//       <InlineEditText
//         value={currentVenue.capacity.toString()}
//         onSave={handleSaveCapacity}
//         style={styles.capacity}
//       />
      
//       {/* Keep all existing buttons and design */}
//       <View style={styles.buttonContainer}>
//         <TouchableOpacity 
//           style={[styles.button, styles.qrButton]} 
//           onPress={() => onGenerateQR(currentVenue.id)}
//         >
//           <Text style={styles.buttonText}>Generate QR</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// };

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  capacity: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  buttonRow: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  marginTop: 10,
},
iconButton: {
  padding: 8,
  marginHorizontal: 10,
},
rowContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
iconContainer: {
  flexDirection: 'row',
  alignItems: 'center',
},
});

export default VenueCard;