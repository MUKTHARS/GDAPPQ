import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import api from '../services/api';
import MemberCard from '../components/MemberCard';

export default function SurveyScreen({ navigation, route }) {
  const { sessionId } = route.params;
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selections, setSelections] = useState({});
  const [members, setMembers] = useState([
    { id: '1', name: 'John Doe', department: 'CS' },
    { id: '2', name: 'Jane Smith', department: 'ECE' },
  ]);

  const questions = [
    "Clarity of arguments",
    "Contribution to discussion",
    "Teamwork and collaboration",
    "Logical reasoning",
    "Communication skills"
  ];

  const handleSelect = (memberId, rank) => {
    setSelections({
      ...selections,
      [currentQuestion]: {
        ...selections[currentQuestion],
        [rank]: memberId
      }
    });
  };

  const handleSubmit = async () => {
    try {
      await api.student.submitSurvey({
        sessionId,
        responses: selections
      });
      navigation.navigate('Results', { sessionId });
    } catch (error) {
      alert('Failed to submit survey');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.question}>
        Q{currentQuestion + 1}: {questions[currentQuestion]}
      </Text>
      
      <Text style={styles.instructions}>
        Select top 3 performers (you cannot select yourself)
      </Text>

      <FlatList
        data={members}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <MemberCard 
            member={item}
            onSelect={(rank) => handleSelect(item.id, rank)}
            selected={Object.values(selections[currentQuestion] || {}).includes(item.id)}
          />
        )}
      />

      <View style={styles.navigation}>
        {currentQuestion > 0 && (
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentQuestion(currentQuestion - 1)}
          >
            <Text>Previous</Text>
          </TouchableOpacity>
        )}
        
        {currentQuestion < questions.length - 1 ? (
          <TouchableOpacity
            style={[styles.navButton, styles.primaryButton]}
            onPress={() => setCurrentQuestion(currentQuestion + 1)}
          >
            <Text>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navButton, styles.primaryButton]}
            onPress={handleSubmit}
          >
            <Text>Submit Survey</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  question: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  instructions: {
    marginBottom: 20,
    color: '#666',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  navButton: {
    padding: 15,
    backgroundColor: '#eee',
    borderRadius: 5,
  },
  primaryButton: {
    backgroundColor: '#2e86de',
  },
});