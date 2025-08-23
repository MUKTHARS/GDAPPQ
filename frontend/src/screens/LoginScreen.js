import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import adminAuth from '../admin/services/auth';
import studentAuth from '../student/services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      // Try admin login first
      try {
        const adminResult = await adminAuth.login(email, password);
        await AsyncStorage.multiSet([
          ['token', adminResult.token],
          ['role', 'admin'],
          ['userId', adminResult.user_id || '']
        ]);
        onLoginSuccess('admin');
        return;
      } catch (adminError) {
        console.log('Admin login failed, trying student:', adminError.message);
      }

      // Try student login
      try {
        const studentResult = await studentAuth.login(email, password);
        await AsyncStorage.multiSet([
          ['token', studentResult.token],
          ['role', 'student'],
          ['level', String(studentResult.level || 1)],
          ['userId', studentResult.user_id || '']
        ]);
        onLoginSuccess('student');
        return;
      } catch (studentError) {
        console.log('Student login failed:', studentError.message);
      }

      // If both fail
      Alert.alert('Login Failed', 'Invalid email or password');
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GD App Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button
        title={loading ? "Logging in..." : "Login"}
        onPress={handleLogin}
        disabled={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
});

export default LoginScreen;