import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import api from '../../admin/services/api';

const FeedbackItem = ({ item }) => {
    return (
        <View style={styles.feedbackItem}>
            <View style={styles.header}>
                <Text style={styles.studentName}>{item.student.name}</Text>
                <Text style={styles.rating}>Rating: {item.rating}/5</Text>
            </View>
            <Text style={styles.department}>{item.student.department} - Year {item.student.year}</Text>
            {item.comments && <Text style={styles.comments}>{item.comments}</Text>}
            <Text style={styles.date}>{item.created_at}</Text>
        </View>
    );
};

export default function FeedbackScreen({ route }) {
    const { sessionId } = route.params;
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchFeedbacks = async () => {
            try {
                const response = await api.admin.getSessionFeedbacks(sessionId);
                if (response.data?.feedbacks) {
                    setFeedbacks(response.data.feedbacks);
                } else {
                    setError('No feedback available');
                }
            } catch (err) {
                setError('Failed to load feedbacks');
                console.error('Feedback error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchFeedbacks();
    }, [sessionId]);

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Loading feedback...</Text>
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
            <Text style={styles.title}>Session Feedback</Text>
            <Text style={styles.subtitle}>{feedbacks.length} responses</Text>
            
            <FlatList
                data={feedbacks}
                keyExtractor={item => item.id}
                renderItem={({ item }) => <FeedbackItem item={item} />}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No feedback available for this session</Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    loadingText: {
        marginTop: 10,
        textAlign: 'center',
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginTop: 20,
    },
    listContainer: {
        paddingBottom: 20,
    },
    emptyText: {
        textAlign: 'center',
        color: '#666',
        fontStyle: 'italic',
    },
    feedbackItem: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    studentName: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    rating: {
        color: '#FFA500',
        fontWeight: 'bold',
    },
    department: {
        color: '#666',
        marginBottom: 10,
    },
    comments: {
        marginTop: 10,
        fontStyle: 'italic',
    },
    date: {
        marginTop: 10,
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
    },
});