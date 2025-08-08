import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../services/api';

export default function WaitingScreen({ navigation, route }) {
    const { sessionId } = route.params;
    const [loading, setLoading] = useState(true);
    const [allCompleted, setAllCompleted] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const checkCompletionStatus = async () => {
            try {
                const response = await api.student.checkSurveyCompletion(sessionId);
                if (response.data.all_completed) {
                    setAllCompleted(true);
                    navigation.replace('Results', { sessionId });
                }
            } catch (err) {
                setError('Failed to check completion status');
            } finally {
                setLoading(false);
            }
        };

        // Check immediately first time
        checkCompletionStatus();

        // Then poll every 5 seconds
        const interval = setInterval(checkCompletionStatus, 5000);

        return () => clearInterval(interval);
    }, [sessionId, navigation]);

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Waiting for others to complete</Text>
            <Text style={styles.message}>
                Please wait while other participants finish their surveys...
            </Text>
            <ActivityIndicator size="large" style={styles.spinner} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 30,
    },
    spinner: {
        marginTop: 20,
    },
    errorText: {
        color: 'red',
        fontSize: 16,
    },
});