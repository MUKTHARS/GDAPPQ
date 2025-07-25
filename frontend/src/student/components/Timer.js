// import React, { useState, useEffect } from 'react';


// export default function Timer({ duration, onComplete, active }) {
//   const [timeLeft, setTimeLeft] = useState(duration * 60); // Convert to seconds

//   useEffect(() => {
//     if (!active) return;
    
//     const interval = setInterval(() => {
//       setTimeLeft(prev => {
//         if (prev <= 1) {
//           clearInterval(interval);
//           onComplete();
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);

//     return () => clearInterval(interval);
//   }, [active]);

//   const minutes = Math.floor(timeLeft / 60);
//   const seconds = timeLeft % 60;

//   return (
//     <View style={styles.container}>
//       <Text style={styles.timerText}>
//         {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
//       </Text>
//     </View>
//   );
// }


// import React, { useEffect, useState } from 'react';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Timer = ({ duration, onComplete, active, initialTimeRemaining, onTick }) => {
  const [remaining, setRemaining] = useState(initialTimeRemaining || duration * 60);
  
  useEffect(() => {
    if (initialTimeRemaining) {
      setRemaining(initialTimeRemaining);
    } else {
      setRemaining(duration * 60);
    }
  }, [duration, initialTimeRemaining]);

  useEffect(() => {
    if (!active || remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining(prev => {
        const newRemaining = prev - 1;
        if (onTick) onTick(newRemaining);
        if (newRemaining <= 0) {
          clearInterval(interval);
          onComplete();
          return 0;
        }
        return newRemaining;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [active, remaining, onComplete, onTick]);

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
    fontSize: 36,
    fontWeight: 'bold',
  },
});

export default Timer;