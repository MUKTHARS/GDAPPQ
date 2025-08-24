import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity,ScrollView,Button, ActivityIndicator, Alert } from 'react-native';
import { Rating } from 'react-native-ratings';
import api from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

export default function FeedbackScreen({ route, navigation }) {
    const { sessionId } = route.params;
    const [rating, setRating] = useState(0);
    const [comments, setComments] = useState('');
    const [loading, setLoading] = useState(false);
    const [existingFeedback, setExistingFeedback] = useState(null);
    const [checkingFeedback, setCheckingFeedback] = useState(true);
const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false)
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

    setSubmitting(true);
    try {
        // Make sure we're sending the data in the correct format
        console.log('Submitting feedback:', {
            session_id: sessionId,
            rating: rating,
            comments: comments
        });
        
        await api.student.submitFeedback(sessionId, rating, comments);
        Alert.alert('Success', 'Thank you for your feedback!');
        navigation.goBack();
    } catch (error) {
        console.error('Feedback submission error details:', error.response?.data || error.message);
        Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
        setSubmitting(false);
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
 const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={star <= rating ? ['#FFD700', '#FFA000'] : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.starGradient}
            >
              <Icon
                name={star <= rating ? 'star' : 'star-border'}
                size={32}
                color={star <= rating ? '#fff' : 'rgba(255,255,255,0.6)'}
              />
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
    return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#667eea']}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)']}
              style={styles.headerIconGradient}
            >
              <Icon name="feedback" size={32} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Session Feedback</Text>
          <Text style={styles.subtitle}>Help us improve your experience</Text>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.ratingGradient}
          >
            <View style={styles.ratingHeader}>
              <Icon name="grade" size={24} color="#FFD700" />
              <Text style={styles.ratingLabel}>Rate Your Experience</Text>
            </View>
            <Text style={styles.ratingSubtext}>
              How would you rate this discussion session?
            </Text>
            {renderStars()}
            {rating > 0 && (
              <Text style={styles.ratingText}>
                {rating === 1 ? 'Poor' : 
                 rating === 2 ? 'Fair' : 
                 rating === 3 ? 'Good' : 
                 rating === 4 ? 'Very Good' : 'Excellent'}
              </Text>
            )}
          </LinearGradient>
        </View>

        {/* Feedback Section */}
        <View style={styles.feedbackCard}>
  <LinearGradient
    colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
    start={{x: 0, y: 0}}
    end={{x: 1, y: 1}}
    style={styles.feedbackGradient}
  >
    <View style={styles.feedbackHeader}>
      <Icon name="edit" size={24} color="#4CAF50" />
      <Text style={styles.feedbackLabel}>Your Feedback</Text>
    </View>
    <Text style={styles.feedbackSubtext}>
      Share your thoughts about the session
    </Text>
    
    <View style={styles.inputContainer}>
      <LinearGradient
        colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
        style={styles.inputGradient}
      >
        <TextInput
          style={styles.textInput}
          placeholder="Tell us about your experience..."
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={comments} // FIXED: Changed from feedback to comments
          onChangeText={setComments}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </LinearGradient>
    </View>
    
    <View style={styles.characterCount}>
      <Text style={styles.characterCountText}>
        {comments.length}/500 characters
      </Text>
    </View>
  </LinearGradient>
</View>


      {/* Submit Button */}
<View style={styles.bottomContainer}>
  <TouchableOpacity 
    style={[styles.submitButton, (submitting || !comments.trim() || rating === 0) && styles.submitButtonDisabled]} // FIXED: Changed from feedback to comments
    onPress={handleSubmit}
    disabled={submitting || !comments.trim() || rating === 0}
    activeOpacity={0.8}
  >
    <LinearGradient
      colors={
        submitting || !comments.trim() || rating === 0  // FIXED: Changed from feedback to comments
          ? ['#9E9E9E', '#757575'] 
          : ['#4CAF50', '#43A047', '#388E3C']
      }
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.submitButtonGradient}
    >
      <View style={styles.submitButtonContent}>
        {submitting ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.submitButtonText}>Submitting...</Text>
          </>
        ) : (
          <>
            <Icon name="send" size={24} color="#fff" />
            <Text style={styles.submitButtonText}>Submit Feedback</Text>
          </>
        )}
      </View>
    </LinearGradient>
  </TouchableOpacity>
  
  <Text style={styles.submitHint}>
    {submitting 
      ? 'Please wait while we save your feedback...' 
      : (!comments.trim() || rating === 0)
        ? 'Please provide rating and feedback to submit'
        : 'Your feedback helps us improve the experience'
    }
  </Text>
</View>
      </ScrollView>
    </LinearGradient>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 25,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIconContainer: {
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 16,
  },
  headerIconGradient: {
    padding: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  ratingCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  ratingGradient: {
    padding: 24,
    alignItems: 'center',
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 12,
  },
  ratingSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starButton: {
    marginHorizontal: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },
  starGradient: {
    padding: 8,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    textAlign: 'center',
  },
  feedbackCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  feedbackGradient: {
    padding: 24,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 12,
  },
  feedbackSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
  },
  inputContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  inputGradient: {
    padding: 16,
  },
  textInput: {
    fontSize: 16,
    color: '#fff',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    alignItems: 'flex-end',
  },
  characterCountText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  bottomContainer: {
    alignItems: 'center',
  },
  submitButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  submitHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
});