import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
    fontSize: 36,
    fontWeight: 'bold',
  },
});

export default Timer;


// import React, { useEffect, useState } from 'react';
// import { View, Text, StyleSheet } from 'react-native';

// const Timer = ({ duration, onComplete, active, initialTimeRemaining, onTick }) => {
//   const [remaining, setRemaining] = useState(initialTimeRemaining || duration * 60);
  
//   useEffect(() => {
//     if (initialTimeRemaining) {
//       setRemaining(initialTimeRemaining);
//     } else {
//       setRemaining(duration * 60);
//     }
//   }, [duration, initialTimeRemaining]);

//   useEffect(() => {
//     if (!active || remaining <= 0) return;

//     const interval = setInterval(() => {
//       setRemaining(prev => {
//         const newRemaining = prev - 1;
//         if (onTick) onTick(newRemaining);
//         if (newRemaining <= 0) {
//           clearInterval(interval);
//           onComplete();
//           return 0;
//         }
//         return newRemaining;
//       });
//     }, 1000);

//     return () => clearInterval(interval);
//   }, [active, remaining, onComplete, onTick]);

//   const minutes = Math.floor(remaining / 60);
//   const seconds = remaining % 60;

//   return (
//     <Text style={styles.timerText}>
//       {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
//     </Text>
//   );
// };

// const styles = StyleSheet.create({
//   timerText: {
//     fontSize: 36,
//     fontWeight: 'bold',
//   },
// });

// export default Timer;