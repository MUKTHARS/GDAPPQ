import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import api from '../services/api';
import Timer from '../components/Timer';

export default function GdSessionScreen({ navigation, route }) {
  const { sessionId } = route.params;
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState('prep');
  const [timerActive, setTimerActive] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await api.student.getSession(sessionId);
        setSession(response.data);
      } catch (error) {
        alert('Failed to load session');
        navigation.goBack();
      }
    };
    fetchSession();
  }, [sessionId]);

  const handlePhaseComplete = () => {
    if (phase === 'prep') {
      setPhase('discussion');
    } else if (phase === 'discussion') {
      setPhase('survey');
    } else {
      navigation.navigate('Survey', { sessionId });
    }
  };

  if (!session) return <View style={styles.loading}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.phaseText}>
        {phase === 'prep' ? 'Preparation' : 'Discussion'} Phase
      </Text>
      
      <Timer 
        duration={phase === 'prep' ? session.prep_time : session.discussion_time}
        onComplete={handlePhaseComplete}
        active={timerActive}
      />

      <Text style={styles.topic}>{session.topic}</Text>
      
      <TouchableOpacity
        style={styles.button}
        onPress={() => setTimerActive(!timerActive)}
      >
        <Text>{timerActive ? 'Pause' : 'Resume'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  topic: {
    fontSize: 20,
    textAlign: 'center',
    marginVertical: 30,
  },
  button: {
    padding: 15,
    backgroundColor: '#ddd',
    borderRadius: 5,
    marginTop: 20,
  },
});