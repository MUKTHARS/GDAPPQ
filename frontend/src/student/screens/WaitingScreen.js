import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, BackHandler, Alert } from 'react-native';
import api from '../services/api';

export default function WaitingScreen({ navigation, route }) {
    const { sessionId } = route.params;
    const [status, setStatus] = useState({
        allCompleted: false,
        completed: 0,
        total: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const pollingRef = useRef(null);
    const [lastUpdate, setLastUpdate] = useState(Date.now());

 const checkCompletionStatus = async () => {
    try {
        const response = await api.student.checkSurveyCompletion(sessionId);
        
        if (response.data) {
            const completed = Number(response.data.completed) || 0;
            const total = Number(response.data.total) || 0;
            const allCompleted = response.data.all_completed === true;
            
            // Minimum 2 participants required (excluding self)
            const hasEnoughParticipants = total >= 2;
            
            setStatus({
                allCompleted: hasEnoughParticipants && allCompleted,
                completed,
                total
            });
            setLastUpdate(Date.now());

            if (hasEnoughParticipants && allCompleted) {
                clearInterval(pollingRef.current);
                navigation.replace('Results', { sessionId });
            }
        }
    } catch (err) {
        console.error('Completion check error:', err);
        setError('Failed to check completion status');
    } finally {
        setLoading(false);
    }
};

    useEffect(() => {
        // Initial check
        checkCompletionStatus();

        // Start polling every 3 seconds
        pollingRef.current = setInterval(checkCompletionStatus, 3000);

        // Handle back button
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                Alert.alert(
                    "Waiting for Results",
                    "Are you sure you want to leave? You won't see the results if you exit now.",
                    [
                        { text: "Cancel", onPress: () => null },
                        { text: "Exit", onPress: () => navigation.goBack() }
                    ]
                );
                return true;
            }
        );

        return () => {
            clearInterval(pollingRef.current);
            backHandler.remove();
        };
    }, [sessionId]);

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Checking survey status...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>{error}</Text>
                <Text style={styles.retryText}>Will retry automatically...</Text>
                <Text style={styles.timestamp}>Last update: {new Date(lastUpdate).toLocaleTimeString()}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Waiting for others to complete</Text>
            
            <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                    {status.completed} of {status.total} scanned participants have completed
                </Text>
                {status.total > 0 && (
                    <Text style={styles.remainingText}>
                        {status.total - status.completed} still completing
                    </Text>
                )}
            </View>

            <ActivityIndicator size="large" style={styles.spinner} />
            
            <Text style={styles.note}>
                Please wait until all scanned participants finish the survey
            </Text>
            <Text style={styles.timestamp}>Last checked: {new Date(lastUpdate).toLocaleTimeString()}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    progressContainer: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        width: '80%',
        alignItems: 'center',
        elevation: 2,
    },
    progressText: {
        fontSize: 16,
        color: '#444',
        marginBottom: 5,
    },
    remainingText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    spinner: {
        marginVertical: 20,
    },
    note: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 10,
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        marginBottom: 10,
    },
    retryText: {
        color: '#666',
        fontSize: 14,
    },
    timestamp: {
        fontSize: 12,
        color: '#999',
        marginTop: 20,
    }
});