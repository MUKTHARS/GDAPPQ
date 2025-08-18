import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Button, ActivityIndicator, Alert } from 'react-native';
import { Rating } from 'react-native-ratings';
import api from '../services/api';

export default function FeedbackScreen({ route, navigation }) {
    const { sessionId } = route.params;
    const [rating, setRating] = useState(3);
    const [comments, setComments] = useState('');
    const [loading, setLoading] = useState(false);
    const [existingFeedback, setExistingFeedback] = useState(null);
    const [checkingFeedback, setCheckingFeedback] = useState(true);

    useEffect(() => {
        const checkFeedback = async () => {
            try {
                const response = await api.student.getFeedback(sessionId);
                // Check if response has data (not empty object)
                if (response.data && Object.keys(response.data).length > 0) {
                    setExistingFeedback(response.data);
                    setRating(response.data.rating || 3);
                    setComments(response.data.comments || '');
                }
            } catch (error) {
                console.log('Error checking feedback:', error);
            } finally {
                setCheckingFeedback(false);
            }
        };
        checkFeedback();
    }, [sessionId]);

    const handleSubmit = async () => {
        if (rating < 1 || rating > 5) {
            Alert.alert('Invalid Rating', 'Please provide a rating between 1 and 5');
            return;
        }

        setLoading(true);
        try {
            await api.student.submitFeedback(sessionId, rating, comments);
            Alert.alert('Success', 'Thank you for your feedback!');
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to submit feedback. Please try again.');
            console.error('Feedback error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (checkingFeedback) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Loading feedback form...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Session Feedback</Text>
            
            <View style={styles.ratingContainer}>
                <Text style={styles.label}>Rating:</Text>
                <Rating
                    type='star'
                    ratingCount={5}
                    imageSize={30}
                    startingValue={rating}
                    onFinishRating={setRating}
                    style={styles.rating}
                />
            </View>

            <Text style={styles.label}>Comments:</Text>
            <TextInput
                style={styles.commentsInput}
                multiline
                numberOfLines={4}
                value={comments}
                onChangeText={setComments}
                placeholder="Share your thoughts about the session..."
            />

            <Button
                title={existingFeedback ? "Update Feedback" : "Submit Feedback"}
                onPress={handleSubmit}
                disabled={loading}
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
        marginBottom: 20,
        textAlign: 'center',
    },
    ratingContainer: {
        marginBottom: 20,
        alignItems: 'center',
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        fontWeight: '500',
    },
    rating: {
        paddingVertical: 10,
    },
    commentsInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 20,
        minHeight: 100,
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 10,
        textAlign: 'center',
    },
});