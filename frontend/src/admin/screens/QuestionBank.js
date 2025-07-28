// QuestionBank.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import api from '../services/api';
import HeaderWithMenu from '../components/HeaderWithMenu';

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState({ text: '', weight: '1.0', levels: [] });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await api.get('/admin/questions');
      setQuestions(response.data);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    }
  };

  const handleSaveQuestion = async () => {
    try {
      if (editingId) {
        await api.put(`/admin/questions/${editingId}`, newQuestion);
      } else {
        await api.post('/admin/questions', newQuestion);
      }
      setNewQuestion({ text: '', weight: '1.0', levels: [] });
      setEditingId(null);
      fetchQuestions();
    } catch (error) {
      console.error('Failed to save question:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Question text"
          value={newQuestion.text}
          onChangeText={(text) => setNewQuestion({...newQuestion, text})}
        />
        <TextInput
          style={styles.input}
          placeholder="Weight (e.g., 1.5)"
          keyboardType="numeric"
          value={newQuestion.weight}
          onChangeText={(weight) => setNewQuestion({...newQuestion, weight})}
        />
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveQuestion}>
          <Text style={styles.saveButtonText}>{editingId ? 'Update' : 'Add'} Question</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={questions}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{item.text}</Text>
            <Text>Weight: {item.weight}</Text>
            <Text>Levels: {item.levels.join(', ')}</Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => {
                setNewQuestion(item);
                setEditingId(item.id);
              }}>
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 10 },
  formContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#fff'
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center'
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  questionCard: {
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 5
  },
  questionText: {
    fontWeight: 'bold',
    marginBottom: 5
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10
  },
  editButton: {
    color: '#007AFF',
    marginLeft: 10
  }
});

// // QuestionBank.js
// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
// import api from '../services/api';

// export default function QuestionBank() {
//   const [questions, setQuestions] = useState([]);
//   const [newQuestion, setNewQuestion] = useState('');
//   const [newWeight, setNewWeight] = useState('1.0');
//   const [editingId, setEditingId] = useState(null);

//   useEffect(() => {
//     fetchQuestions();
//   }, []);

//   const fetchQuestions = async () => {
//     try {
//       const response = await api.get('/admin/questions');
//       setQuestions(response.data);
//     } catch (error) {
//       console.error(error);
//     }
//   };

//   const handleAddQuestion = async () => {
//     if (!newQuestion.trim()) return;
    
//     try {
//       await api.post('/admin/questions', {
//         text: newQuestion,
//         weight: parseFloat(newWeight) || 1.0
//       });
//       setNewQuestion('');
//       setNewWeight('1.0');
//       fetchQuestions();
//     } catch (error) {
//       console.error(error);
//     }
//   };

//   const handleUpdateQuestion = async (id) => {
//     try {
//       await api.put(`/admin/questions/${id}`, {
//         text: newQuestion,
//         weight: parseFloat(newWeight) || 1.0
//       });
//       setEditingId(null);
//       setNewQuestion('');
//       setNewWeight('1.0');
//       fetchQuestions();
//     } catch (error) {
//       console.error(error);
//     }
//   };

//   const handleDeleteQuestion = async (id) => {
//     try {
//       await api.delete(`/admin/questions/${id}`);
//       fetchQuestions();
//     } catch (error) {
//       console.error(error);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.formContainer}>
//         <TextInput
//           style={styles.input}
//           placeholder="Question text"
//           value={newQuestion}
//           onChangeText={setNewQuestion}
//         />
//         <TextInput
//           style={[styles.input, { width: 80 }]}
//           placeholder="Weight"
//           value={newWeight}
//           onChangeText={setNewWeight}
//           keyboardType="numeric"
//         />
//         {editingId ? (
//           <TouchableOpacity 
//             style={styles.button} 
//             onPress={() => handleUpdateQuestion(editingId)}
//           >
//             <Text style={styles.buttonText}>Update</Text>
//           </TouchableOpacity>
//         ) : (
//           <TouchableOpacity 
//             style={styles.button} 
//             onPress={handleAddQuestion}
//           >
//             <Text style={styles.buttonText}>Add</Text>
//           </TouchableOpacity>
//         )}
//       </View>

//       <FlatList
//         data={questions}
//         keyExtractor={item => item.id}
//         renderItem={({item}) => (
//           <View style={styles.questionCard}>
//             <View style={styles.questionContent}>
//               <Text style={styles.questionText}>{item.text}</Text>
//               <Text style={styles.weightText}>Weight: {item.weight}</Text>
//             </View>
//             <View style={styles.actions}>
//               <TouchableOpacity onPress={() => {
//                 setEditingId(item.id);
//                 setNewQuestion(item.text);
//                 setNewWeight(String(item.weight));
//               }}>
//                 <Text style={styles.editButton}>Edit</Text>
//               </TouchableOpacity>
//               <TouchableOpacity onPress={() => handleDeleteQuestion(item.id)}>
//                 <Text style={styles.deleteButton}>Delete</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         )}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { padding: 10 },
//   formContainer: {
//     flexDirection: 'row',
//     marginBottom: 15,
//     alignItems: 'center'
//   },
//   input: {
//     flex: 1,
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 5,
//     padding: 10,
//     marginRight: 10
//   },
//   button: {
//     backgroundColor: '#007AFF',
//     padding: 10,
//     borderRadius: 5
//   },
//   buttonText: {
//     color: 'white',
//     textAlign: 'center'
//   },
//   questionCard: {
//     padding: 15,
//     marginVertical: 5,
//     backgroundColor: '#fff',
//     borderRadius: 5,
//     flexDirection: 'row',
//     justifyContent: 'space-between'
//   },
//   questionContent: {
//     flex: 1
//   },
//   questionText: {
//     fontWeight: 'bold',
//     marginBottom: 5
//   },
//   weightText: {
//     color: '#666'
//   },
//   actions: {
//     flexDirection: 'row',
//     alignItems: 'center'
//   },
//   editButton: {
//     color: '#007AFF',
//     marginRight: 15
//   },
//   deleteButton: {
//     color: '#FF3B30'
//   }
// });