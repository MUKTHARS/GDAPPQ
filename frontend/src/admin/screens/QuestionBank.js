import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import api from '../services/api';
import HeaderWithMenu from '../components/HeaderWithMenu';
export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await api.get('/admin/questions');
      setQuestions(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
        <HeaderWithMenu />
      <FlatList
        data={questions}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{item.text}</Text>
            <Text>Weight: {item.weight}</Text>
            <Text>Levels: {item.levels.join(', ')}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 10 },
  questionCard: {
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 5
  },
  questionText: {
    fontWeight: 'bold',
    marginBottom: 5
  }
});