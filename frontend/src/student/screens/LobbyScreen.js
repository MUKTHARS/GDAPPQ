import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  FlatList,
  TouchableOpacity
} from 'react-native';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globalStyles, colors, layout } from '../assets/globalStyles';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function LobbyScreen({ navigation, route }) {
    const { sessionId } = route.params;
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);


    const fetchParticipants = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await api.get('/student/session/participants', { 
                params: { session_id: sessionId },
                headers: {
                    Authorization: `Bearer ${token.replace(/['"]+/g, '')}`
                },
                validateStatus: function (status) {
                    return status === 200 || status === 404;
                }
            });
            
            if (response.status === 404) {
                setParticipants([]);
            } else {
                setParticipants(response.data?.data || []);
            }
        } catch (error) {
            console.error('Error fetching participants:', error);
            setParticipants([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchParticipants();

        // Poll every 5 seconds
        const interval = setInterval(fetchParticipants, 5000);

        return () => {
            clearInterval(interval);
        };
    }, [sessionId]);

    const handleReady = async () => {
        try {
            setIsReady(true);
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            await api.put('/student/session/status', { 
                sessionId, 
                status: 'active'
            }, {
                headers: {
                    Authorization: `Bearer ${token.replace(/['"]+/g, '')}`
                }
            });
            
            navigation.replace('GdSession', { sessionId });
        } catch (error) {
            console.error('Error starting session:', error);
            setIsReady(false);
        }
    };

    if (loading) {
        return (
            <ImageBackground 
                // source={require('../../assets/gd-bg.jpg')} 
                style={styles.container}
                resizeMode="cover"
            >
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#4A90E2" />
                </View>
            </ImageBackground>
        );
    }

    return (
        <ImageBackground 
            // source={require('../../assets/gd-bg.jpg')} 
            style={styles.container}
            resizeMode="cover"
        >
            <View style={styles.contentContainer}>
                <Text style={styles.title}>Session Lobby</Text>
                
                <View style={styles.participantsContainer}>
                    <Text style={styles.subtitle}>Participants ({participants.length}):</Text>
                    <FlatList
                        data={participants}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <View style={styles.participantCard}>
                                <Text style={styles.participantName}>{item.name}</Text>
                                {item.department && (
                                    <Text style={styles.participantDept}>{item.department}</Text>
                                )}
                            </View>
                        )}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>No other participants yet</Text>
                        }
                    />
                </View>

                <TouchableOpacity 
                    style={[styles.readyButton, isReady && styles.readyButtonActive]}
                    onPress={handleReady}
                    disabled={isReady}
                >
                    <Text style={styles.readyButtonText}>
                        {isReady ? 'Starting Session...' : 'I\'m Ready'}
                    </Text>
                </TouchableOpacity>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        padding: 20,
        backgroundColor: '#2C6DB4',
    },
    loadingOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 20,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    participantsContainer: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
    },
    subtitle: {
        fontSize: 18,
        color: '#FFFFFF',
        marginBottom: 10,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 10,
    },
    participantCard: {
        backgroundColor: 'rgba(74, 226, 206, 0.2)',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    participantName: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    participantDept: {
        fontSize: 14,
        color: '#CCCCCC',
        marginTop: 4,
    },
    emptyText: {
        color: '#CCCCCC',
        textAlign: 'center',
        marginTop: 20,
    },
    readyButton: {
        backgroundColor: '#4A90E2',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    readyButtonActive: {
        backgroundColor: '#2C6DB4',
    },
    readyButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});