import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';

const Timer = ({ duration, onComplete, active = true, initialTimeRemaining, onTick }) => {
  const [remaining, setRemaining] = useState(initialTimeRemaining || duration);
  
  useEffect(() => {
    if (initialTimeRemaining) {
      setRemaining(initialTimeRemaining);
    } else {
      setRemaining(duration); 
    }
  }, [duration, initialTimeRemaining]);

  useEffect(() => {
    if (!active || remaining <= 0) return;

    const interval = setInterval(() => {
      const newRemaining = remaining - 1;
      
      if (onTick) onTick(newRemaining);
      
      setRemaining(newRemaining);
      
      if (newRemaining <= 0) {
        clearInterval(interval);
        onComplete();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [active, remaining, onComplete, onTick]);

  // Convert seconds to minutes:seconds format
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <Text style={styles.timerText}>
      {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
    </Text>
  );
};

const styles = StyleSheet.create({
  timerText: {
    fontSize: 60,            // Bigger size
    fontWeight: 'bold',
    color: '#FFFFFF',        // White color
    textAlign: 'center',
    letterSpacing: 2,        // Space between characters for style
    textShadowColor: 'rgba(0, 0, 0, 0.6)', // Soft shadow for visibility
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
});

export default Timer;
