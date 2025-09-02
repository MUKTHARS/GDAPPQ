// frontend/src/student/components/Timer.js
import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import api from '../services/api';

const Timer = ({ 
  duration, 
  onComplete, 
  active = true, 
  initialTimeRemaining, 
  onTick,
  sessionId,
  phase 
}) => {
  const [remaining, setRemaining] = useState(initialTimeRemaining || duration);
  const [loading, setLoading] = useState(true);
  const [usingServerTime, setUsingServerTime] = useState(false);

  // Try to sync with server once on mount, but fallback to local timer
  useEffect(() => {
    const tryServerSync = async () => {
      if (!sessionId || !phase) {
        setLoading(false);
        return;
      }

      try {
        // Try to get time from server (with timeout to prevent hanging)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        );
        
        const fetchPromise = api.student.getSessionPhaseTime(sessionId, phase);
        
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (response.data && response.data.remaining_seconds !== undefined) {
          const serverRemaining = response.data.remaining_seconds;
          setRemaining(serverRemaining);
          if (onTick) onTick(serverRemaining);
          setUsingServerTime(true);
          
          // If server says time is up, trigger completion
          if (serverRemaining <= 0) {
            onComplete();
          }
        }
      } catch (error) {
        console.log('Using local timer as fallback:', error.message);
        // Fallback to local timer
        if (initialTimeRemaining) {
          setRemaining(initialTimeRemaining);
        } else {
          setRemaining(duration);
        }
        setUsingServerTime(false);
      } finally {
        setLoading(false);
      }
    };

    tryServerSync();
  }, [sessionId, phase]);

  useEffect(() => {
    if (!active || remaining <= 0) return;

    const interval = setInterval(() => {
      const newRemaining = remaining - 1;
      
      setRemaining(newRemaining);
      if (onTick) onTick(newRemaining);
      
      if (newRemaining <= 0) {
        clearInterval(interval);
        onComplete();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [active, remaining, onComplete, onTick]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading timer...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.timerText}>
        {formatTime(remaining)}
      </Text>
      {!usingServerTime && (
        <Text style={styles.warningText}>Using local timer</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 8,
    fontSize: 12,
  },
  warningText: {
    color: '#FFA500',
    fontSize: 10,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default Timer;