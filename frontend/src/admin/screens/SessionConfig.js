// frontend/src/admin/screens/SessionConfig.js
import React, { useState, useEffect } from 'react';
import { View, Button, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AgendaEditor from '../components/AgendaEditor';
import api from '../services/api';

export default function SessionConfig() {
  const [level, setLevel] = useState(1);
  const [agenda, setAgenda] = useState({
    prep_time: 0,
    discussion: 0,
    survey: 0
  });
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingRules, setIsFetchingRules] = useState(false);

 useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsFetchingRules(true);
        // Fetch venues
        const venuesResponse = await api.admin.getVenues();
        setVenues(venuesResponse.data);
        if (venuesResponse.data.length > 0) {
          setSelectedVenue(venuesResponse.data[0].id);
        }

        // Fetch rules for default level (1)
        const rulesResponse = await api.admin.getSessionRules(1);
        setAgenda({
          prep_time: rulesResponse.data.prep_time || 5,
          discussion: rulesResponse.data.discussion_time || 20,
          survey: rulesResponse.data.survey_time || 5
        });
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      } finally {
        setIsFetchingRules(false);
      }
    };
    fetchInitialData();
  }, []);

  // Handle level change to fetch appropriate rules
  const handleLevelChange = async (newLevel) => {
    setLevel(newLevel);
    try {
      setIsFetchingRules(true);
      const response = await api.admin.getSessionRules(newLevel);
      setAgenda({
        prep_time: response.data.prep_time,
        discussion: response.data.discussion_time,
        survey: response.data.survey_time
      });
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setIsFetchingRules(false);
    }
  };
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const response = await api.admin.getVenues();
        setVenues(response.data);
        if (response.data.length > 0) {
          setSelectedVenue(response.data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch venues:', error);
      }
    };
    fetchVenues();
  }, []);
const handleSaveSession = async () => {
    setIsLoading(true);
    try {
        console.log("Saving session with data:", {
            venue_id: selectedVenue,
            level,
            agenda,
            survey_weights: {
                participation: 0.4,
                knowledge: 0.3,
                communication: 0.3
            }
        });

        const response = await api.admin.createBulkSessions({
            sessions: [{
                venue_id: selectedVenue,
                level: level,
                start_time: new Date().toISOString(),
                agenda: agenda,
                survey_weights: {
                    participation: 0.4,
                    knowledge: 0.3,
                    communication: 0.3
                }
            }]
        });

        console.log("Server response:", response);

        if (response.status === 200 && response.data && response.data.status === 'success') {
            Alert.alert('Success', 'Session created successfully');
        } else {
            const errorMsg = response.data?.error || 
                           response.statusText || 
                           'Failed to create session';
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error("Session creation error:", error);
        Alert.alert('Error', error.message || 'Failed to create session');
    } finally {
        setIsLoading(false);
    }
};
//   const handleSaveSession = async () => {
//     setIsLoading(true);
//     try {
//       console.log("Saving session with data:", {
//             venue_id: selectedVenue,
//             level,
//             agenda,
//             survey_weights: {
//                 participation: 0.4,
//                 knowledge: 0.3,
//                 communication: 0.3
//             }
//             });
//       const response = await api.admin.createBulkSessions({
//         sessions: [{
//           venue_id: selectedVenue,
//           level: level,
//           start_time: new Date().toISOString(),
//           agenda: agenda,
//           survey_weights: {
//             participation: 0.4,
//             knowledge: 0.3,
//             communication: 0.3
//           }
//         }]
//       });
//    console.log("Server response:", response);
//       if (response.status === 200 && response.data && response.data.status === 'success') {
//             Alert.alert('Success', 'Session created successfully');
//         } else {
//             const errorMsg = response.data?.error || 
//                            response.statusText || 
//                            'Failed to create session';
//             throw new Error(errorMsg);
//         }
//     } catch (error) {
//         console.error("Session creation error:", error);
//         Alert.alert('Error', error.message || 'Failed to create session');
//     } finally {
//         setIsLoading(false);
//     }
// };

  return (
    <View style={{ padding: 20 }}>
      <Picker
        selectedValue={selectedVenue}
        onValueChange={setSelectedVenue}
        style={{ marginBottom: 20 }}
      >
        {venues.map(venue => (
          <Picker.Item 
            key={venue.id} 
            label={venue.name} 
            value={venue.id} 
          />
        ))}
      </Picker>
      
      <Picker
        selectedValue={level}
        onValueChange={setLevel}
        style={{ marginBottom: 20 }}
      >
        <Picker.Item label="Level 1" value={1} />
        <Picker.Item label="Level 2" value={2} />
      </Picker>
      
      <AgendaEditor agenda={agenda} onChange={setAgenda} />
      
      <Button
        title={isLoading ? "Saving..." : "Save Session"}
        onPress={handleSaveSession}
        disabled={isLoading || !selectedVenue}
      />
    </View>
  );
}


// import React, { useState, useEffect } from 'react';
// import { View, Button, Alert } from 'react-native';
// import { Picker } from '@react-native-picker/picker';
// import AgendaEditor from '../components/AgendaEditor';
// import api from '../services/api';
// import HeaderWithMenu from '../components/HeaderWithMenu';
// export default function SessionConfig() {
//   const [level, setLevel] = useState(1);
//   const [agenda, setAgenda] = useState({
//     prep_time: 5,
//     discussion: 20,
//     survey: 5
//   });
//   const [venues, setVenues] = useState([]);
//   const [selectedVenue, setSelectedVenue] = useState('');
//   const [isLoading, setIsLoading] = useState(false);

//   useEffect(() => {
//     const fetchVenues = async () => {
//       try {
//         const response = await api.get('/admin/venues');
//         setVenues(response.data);
//         if (response.data.length > 0) {
//           setSelectedVenue(response.data[0].id);
//         }
//       } catch (error) {
//         console.error('Failed to fetch venues:', error);
//       }
//     };
//     fetchVenues();
//   }, []);

//   const handleSaveSession = async () => {
//     setIsLoading(true);
//     try {
//       await api.post('/admin/sessions/bulk', {
//         sessions: [{
//           venue_id: selectedVenue,
//           level,
//           start_time: new Date().toISOString(),
//           agenda,
//           survey_weights: {
//             participation: 0.4,
//             knowledge: 0.3,
//             communication: 0.3
//           }
//         }]
//       });
//       Alert.alert('Success', 'Session created successfully');
//     } catch (error) {
//       error.message('Error', error.message || 'Failed to create session');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <View style={{ padding: 20 }}>
     
//       <Picker
//         selectedValue={selectedVenue}
//         onValueChange={setSelectedVenue}
//         style={{ marginBottom: 20 }}
//       >
//         {venues.map(venue => (
//           <Picker.Item 
//             key={venue.id} 
//             label={venue.name} 
//             value={venue.id} 
//           />
//         ))}
//       </Picker>
      
//       <Picker
//         selectedValue={level}
//         onValueChange={setLevel}
//         style={{ marginBottom: 20 }}
//       >
//         <Picker.Item label="Level 1" value={1} />
//         <Picker.Item label="Level 2" value={2} />
//       </Picker>
      
//       <AgendaEditor agenda={agenda} onChange={setAgenda} />
      
//       <Button
//         title={isLoading ? "Saving..." : "Save Session"}
//         onPress={handleSaveSession}
//         disabled={isLoading || !selectedVenue}
//       />
//     </View>
//   );
// }

