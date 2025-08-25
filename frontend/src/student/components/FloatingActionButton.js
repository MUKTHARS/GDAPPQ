import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const FloatingActionButton = ({ onPress, iconName = 'qr-code-scanner' }) => {
  const rippleAnim1 = useRef(new Animated.Value(0)).current;
  const rippleAnim2 = useRef(new Animated.Value(0)).current;
  const rippleAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Water ripple effect animations with staggered timing
    const createRippleAnimation = (animValue, delay = 0) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const ripple1 = createRippleAnimation(rippleAnim1, 0);
    const ripple2 = createRippleAnimation(rippleAnim2, 600);
    const ripple3 = createRippleAnimation(rippleAnim3, 1200);

    ripple1.start();
    ripple2.start();
    ripple3.start();

    return () => {
      ripple1.stop();
      ripple2.stop();
      ripple3.stop();
    };
  }, []);

  const createRippleStyle = (animValue) => {
    return {
      transform: [
        {
          scale: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 2.5],
          }),
        },
      ],
      opacity: animValue.interpolate({
        inputRange: [0, 0.3, 1],
        outputRange: [0, 0.8, 0],
      }),
    };
  };

  return (
    <>
      {/* Water ripple effects */}
      <Animated.View style={[styles.ripple, createRippleStyle(rippleAnim1)]}>
        <LinearGradient
          colors={['rgba(64, 196, 255, 0.3)', 'rgba(64, 196, 255, 0.1)']}
          style={styles.rippleGradient}
        />
      </Animated.View>
      
      <Animated.View style={[styles.ripple, createRippleStyle(rippleAnim2)]}>
        <LinearGradient
          colors={['rgba(64, 196, 255, 0.25)', 'rgba(64, 196, 255, 0.05)']}
          style={styles.rippleGradient}
        />
      </Animated.View>
      
      <Animated.View style={[styles.ripple, createRippleStyle(rippleAnim3)]}>
        <LinearGradient
          colors={['rgba(64, 196, 255, 0.2)', 'rgba(64, 196, 255, 0.02)']}
          style={styles.rippleGradient}
        />
      </Animated.View>

      {/* Main FAB Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.8}>
          <LinearGradient
            colors={['#667eea', '#764ba2', '#667eea']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Icon name={iconName} size={32} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: 40,
    bottom: 80,
    width: 70,
    height: 70,
    borderRadius: 35,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
   
  },
  fab: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    overflow: 'hidden',
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 35,
  },
  ripple: {
    position: 'absolute',
    right: 40,
    bottom: 80,
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rippleGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    borderWidth: 2,
    borderColor: 'rgba(64, 196, 255, 0.4)',
  },
});

export default FloatingActionButton;