import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Modal, ActivityIndicator, TouchableOpacity } from 'react-native';
import api from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import HamburgerHeader from '../components/HamburgerHeader';

const ResultItem = ({ item, index }) => {
  // Ensure numeric values
  const totalScore = typeof item.total_score === 'string' ? 
    parseFloat(item.total_score) : item.total_score || 0;
  const penaltyPoints = typeof item.penalty_points === 'string' ? 
    parseFloat(item.penalty_points) : item.penalty_points || 0;
  const finalScore = typeof item.final_score === 'string' ? 
    parseFloat(item.final_score) : totalScore - penaltyPoints;
  const biasedQuestions = item.biased_questions || 0;
  
  // Use the photo_url from the item, fallback to avatar API
  const profileImage = item.photo_url || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random&color=fff`;
  
  const [showPenaltyDetails, setShowPenaltyDetails] = useState(false);

  const getRankColors = (position) => {
    switch (position) {
      case 0: return ['#FFD700', '#FFA000']; // Gold
      case 1: return ['#C0C0C0', '#9E9E9E']; // Silver
      case 2: return ['#CD7F32', '#8D6E63']; // Bronze
      default: return ['#4F46E5', '#7C3AED']; // Purple gradient
    }
  };

  // Generate penalty details based on biased questions count
 const penaltyDetails = biasedQuestions > 0 ? [
    { 
      points: penaltyPoints, 
      reason: `${biasedQuestions} biased ranking(s)`, 
      description: 'Deviated significantly from consensus ratings'
    }
  ] : [];

 
  return (
    <View style={[styles.resultItem, { opacity: 0.9 + (index * 0.01) }]}>
      <View style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <View style={styles.rankContainer}>
            <LinearGradient
              colors={getRankColors(index)}
              style={styles.rankBadge}
            >
              <Text style={styles.rankText}>{index + 1}</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.profileContainer}>
            <Image
              source={{ uri: profileImage }}
              style={styles.profileImage}
              onError={() => console.log('Image load error')}
            />
          </View>
          
          <View style={styles.detailsContainer}>
            <Text style={styles.nameText}>{item.name}</Text>
            
            {/* Scores Container */}
            <View style={styles.scoresContainer}>
              {/* Total Score */}
              <View style={styles.scoreItem}>
                <Icon name="add-circle" size={16} color="#10B981" />
                <Text style={styles.scoreText}>{totalScore.toFixed(1)}</Text>
              </View>
              
              {/* Penalty Points */}
              {penaltyPoints > 0 && (
                <View style={styles.scoreItem}>
                  <Icon name="remove-circle" size={16} color="#EF4444" />
                  <Text style={styles.penaltyText}>-{penaltyPoints.toFixed(1)}</Text>
                  <TouchableOpacity 
                    onPress={() => setShowPenaltyDetails(!showPenaltyDetails)}
                    style={styles.penaltyInfoButton}
                  >
                    <Icon name="info-outline" size={14} color="#F59E0B" />
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Final Score */}
              <View style={styles.finalScoreContainer}>
                <Text style={styles.finalScoreText}>{finalScore.toFixed(1)}</Text>
                <Text style={styles.finalScoreLabel}>Final</Text>
              </View>
            </View>

            {/* Penalty Details */}
            {showPenaltyDetails && penaltyPoints > 0 && (
              <View style={styles.penaltyDetailsContainer}>
                <View style={styles.penaltyDetailItem}>
                  <Icon name="warning" size={14} color="#F59E0B" />
                  <Text style={styles.penaltyDetailText}>
                    {biasedQuestions} biased ranking{biasedQuestions !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.penaltyDetailItem}>
                  <Icon name="error-outline" size={12} color="#EF4444" />
                  <Text style={styles.penaltyDetailSmallText}>
                    Ratings differed significantly from group consensus
                  </Text>
                </View>
                <View style={styles.penaltyDetailItem}>
                  <Icon name="info-outline" size={12} color="#3B82F6" />
                  <Text style={styles.penaltyDetailSmallText}>
                    -1 point per significant deviation
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

export default function ResultsScreen({ route, navigation }) {
  const { sessionId } = route.params;
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPenaltyInfo, setShowPenaltyInfo] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const response = await api.student.getResults(sessionId);
        
        console.log('Results API response:', response.data);
        
        if (response.data?.results) {
          // Process results to ensure correct data types
          const processedResults = response.data.results
            .map(item => ({
              ...item,
              // Ensure numeric values - handle both string and number types
              total_score: typeof item.total_score === 'string' ? 
                parseFloat(item.total_score) : item.total_score || 0,
              penalty_points: typeof item.penalty_points === 'string' ? 
                parseFloat(item.penalty_points) : item.penalty_points || 0,
              final_score: typeof item.final_score === 'string' ? 
                parseFloat(item.final_score) : 
                (item.total_score || 0) - (item.penalty_points || 0),
              biased_questions: item.biased_questions || 0
            }))
            // Sort by final_score descending as backup
            .sort((a, b) => b.final_score - a.final_score);
          
          setResults(processedResults);
        } else {
          setError('No results available for this session');
        }
      } catch (err) {
        setError('Failed to load results');
        console.error('Results error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingTitle}>Loading Results</Text>
            <Text style={styles.loadingSubtitle}>Please wait while we fetch the session results...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <View style={styles.errorIconContainer}>
              <Icon name="error-outline" size={64} color="#64748B" />
            </View>
            <Text style={styles.errorTitle}>Unable to Load Results</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity 
              style={styles.backButtonContainer}
              onPress={() => navigation.goBack()}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.backButtonGradient}
              >
                <Icon name="arrow-back" size={20} color="#fff" />
                <Text style={styles.backButtonText}>Go Back</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

    return (
    <View style={styles.container}>
      {/* <HamburgerHeader title="Session Results" /> */}
      <View style={styles.contentContainer}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View>
              <Text style={styles.title}>Session Results</Text>
              <Text style={styles.subtitle}>Final rankings and scores</Text>
            </View>
          </View>
          <TouchableOpacity 
            onPress={() => setShowPenaltyInfo(true)}
            style={styles.infoButton}
          >
            <Icon name="info" size={24} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Icon name="group" size={24} color="#4F46E5" />
              </View>
              <Text style={styles.statNumber}>{results.length}</Text>
              <Text style={styles.statLabel}>Participants</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Icon name="emoji-events" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.statNumber}>
                {results.length > 0 ? results[0].final_score?.toFixed(1) || '0.0' : '0.0'}
              </Text>
              <Text style={styles.statLabel}>Top Score</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Icon name="check-circle" size={24} color="#10B981" />
              </View>
              <Text style={styles.statNumber}>Completed</Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
        </View>

        {/* Results List */}
        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>
              Final Rankings ({results.length})
            </Text>
          </View>
          
          <View style={styles.resultsList}>
            {results.length > 0 ? (
              <FlatList
                data={results}
                keyExtractor={(item, index) => item.student_id || `result-${index}`}
                renderItem={({ item, index }) => <ResultItem item={item} index={index} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Icon name="assessment" size={48} color="#6B7280" />
                </View>
                <Text style={styles.emptyTitle}>No Results Available</Text>
                <Text style={styles.emptyText}>
                  Results for this session are not yet available
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom feedback section */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity 
            style={styles.feedbackButton}
            onPress={() => navigation.navigate('Feedback', { sessionId })}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.feedbackButtonGradient}
            >
              <View style={styles.feedbackButtonContent}>
                <Icon name="feedback" size={24} color="#fff" />
                <Text style={styles.feedbackButtonText}>Give Feedback</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          
          <Text style={styles.feedbackHint}>
            Help us improve your experience
          </Text>
        </View>
      </View>

      {/* Penalty Info Modal */}
{showPenaltyInfo && (
  <Modal
    visible={showPenaltyInfo}
    transparent={true}
    animationType="slide"
    onRequestClose={() => setShowPenaltyInfo(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Penalty System</Text>
          <TouchableOpacity 
            onPress={() => setShowPenaltyInfo(false)}
            style={styles.closeButton}
          >
            <Icon name="close" size={24} color="#F8FAFC" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalBody}>
          <Text style={styles.modalDescription}>
            Penalties are applied when your ratings differ significantly from the group consensus:
          </Text>
          
          <View style={styles.penaltyRule}>
            <Icon name="warning" size={20} color="#F59E0B" />
            <Text style={styles.penaltyRuleText}>
              Deviation ≥ 2 points from average: -1 point per occurrence
            </Text>
          </View>
          
          <View style={styles.penaltyRule}>
            <Icon name="info" size={20} color="#3B82F6" />
            <Text style={styles.penaltyRuleText}>
              Average is calculated excluding self-ratings
            </Text>
          </View>
          
          <View style={styles.penaltyRule}>
            <Icon name="group" size={20} color="#10B981" />
            <Text style={styles.penaltyRuleText}>
              Designed to encourage fair and consistent evaluations
            </Text>
          </View>
        </View>
      </View>
    </View>
  </Modal>
)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030508ff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingCard: {
    backgroundColor: '#090d13ff',
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorCard: {
    backgroundColor: '#090d13ff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorIconContainer: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  backButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  backButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  infoButton: {
    padding: 8,
  },
  statsContainer: {
    backgroundColor: '#090d13ff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#334155',
    marginHorizontal: 16,
  },
  resultsContainer: {
    flex: 1,
    marginBottom: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  resultsList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 10,
  },
  resultItem: {
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#090d13ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankContainer: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 60,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  profileContainer: {
    marginRight: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  detailsContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  scoresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scoreText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  penaltyText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
    marginLeft: 4,
  },
  penaltyInfoButton: {
    marginLeft: 4,
    padding: 4,
  },
  finalScoreContainer: {
    alignItems: 'center',
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  finalScoreText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  finalScoreLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  penaltyDetailsContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#374151',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  penaltyDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  penaltyDetailText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  penaltyDetailSmallText: {
    color: '#D1D5DB',
    fontSize: 11,
    marginLeft: 6,
    flex: 1,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#090d13ff',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  feedbackButton: {
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
  feedbackButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  feedbackButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  feedbackHint: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#090d13ff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    gap: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: '#94A3B8',
    lineHeight: 22,
  },
  penaltyRule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 12,
  },
  penaltyRuleText: {
    color: '#F8FAFC',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
});






// import React, { useState, useEffect } from 'react';
// import { View, Text, StyleSheet, FlatList, Image, Modal, ActivityIndicator, TouchableOpacity } from 'react-native';
// import api from '../services/api';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import LinearGradient from 'react-native-linear-gradient';

// const ResultItem = ({ item, index }) => {
//   // Ensure numeric values
//   const totalScore = typeof item.total_score === 'string' ? 
//     parseFloat(item.total_score) : item.total_score || 0;
//   const penaltyPoints = typeof item.penalty_points === 'string' ? 
//     parseFloat(item.penalty_points) : item.penalty_points || 0;
//   const finalScore = typeof item.final_score === 'string' ? 
//     parseFloat(item.final_score) : totalScore - penaltyPoints;
//   const biasedQuestions = item.biased_questions || 0;
  
//   // Use the photo_url from the item, fallback to avatar API
//   const profileImage = item.photo_url || 
//     `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random&color=fff`;
  
//   const [showPenaltyDetails, setShowPenaltyDetails] = useState(false);

//   const getRankColors = (position) => {
//     switch (position) {
//       case 0: return ['#FFD700', '#FFA000']; // Gold
//       case 1: return ['#C0C0C0', '#9E9E9E']; // Silver
//       case 2: return ['#CD7F32', '#8D6E63']; // Bronze
//       default: return ['#4CAF50', '#388E3C']; // Default green
//     }
//   };

//   // Generate penalty details based on biased questions count
//  const penaltyDetails = biasedQuestions > 0 ? [
//     { 
//       points: penaltyPoints, 
//       reason: `${biasedQuestions} biased ranking(s)`, 
//       description: 'Deviated significantly from consensus ratings'
//     }
//   ] : [];

 
//   return (
//     <View style={[styles.resultItem, { opacity: 0.9 + (index * 0.01) }]}>
//       <LinearGradient
//         colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
//         style={styles.resultGradient}
//       >
//         <View style={styles.resultHeader}>
//           <View style={styles.rankContainer}>
//             <LinearGradient
//               colors={getRankColors(index)}
//               style={styles.rankBadge}
//             >
//               <Text style={styles.rankText}>{index + 1}</Text>
//             </LinearGradient>
//           </View>
          
//           <View style={styles.profileContainer}>
//             <Image
//               source={{ uri: profileImage }}
//               style={styles.profileImage}
//               onError={() => console.log('Image load error')}
//             />
//           </View>
          
//           <View style={styles.detailsContainer}>
//             <Text style={styles.nameText}>{item.name}</Text>
            
//             {/* Scores Container */}
//             <View style={styles.scoresContainer}>
//               {/* Total Score */}
//               <View style={styles.scoreItem}>
//                 <Icon name="add-circle" size={16} color="#4CAF50" />
//                 <Text style={styles.scoreText}>{totalScore.toFixed(1)}</Text>
//               </View>
              
//               {/* Penalty Points */}
//               {penaltyPoints > 0 && (
//                 <View style={styles.scoreItem}>
//                   <Icon name="remove-circle" size={16} color="#F44336" />
//                   <Text style={styles.penaltyText}>-{penaltyPoints.toFixed(1)}</Text>
//                   <TouchableOpacity 
//                     onPress={() => setShowPenaltyDetails(!showPenaltyDetails)}
//                     style={styles.penaltyInfoButton}
//                   >
//                     <Icon name="info-outline" size={14} color="#FF9800" />
//                   </TouchableOpacity>
//                 </View>
//               )}
              
//               {/* Final Score */}
//               <View style={styles.finalScoreContainer}>
//                 <Text style={styles.finalScoreText}>{finalScore.toFixed(1)}</Text>
//                 <Text style={styles.finalScoreLabel}>Final</Text>
//               </View>
//             </View>

//             {/* Penalty Details */}
//             {showPenaltyDetails && penaltyPoints > 0 && (
//               <View style={styles.penaltyDetailsContainer}>
//                 <View style={styles.penaltyDetailItem}>
//                   <Icon name="warning" size={14} color="#FF9800" />
//                   <Text style={styles.penaltyDetailText}>
//                     {biasedQuestions} biased ranking{biasedQuestions !== 1 ? 's' : ''}
//                   </Text>
//                 </View>
//                 <View style={styles.penaltyDetailItem}>
//                   <Icon name="error-outline" size={12} color="#F44336" />
//                   <Text style={styles.penaltyDetailSmallText}>
//                     Ratings differed significantly from group consensus
//                   </Text>
//                 </View>
//                 <View style={styles.penaltyDetailItem}>
//                   <Icon name="info-outline" size={12} color="#2196F3" />
//                   <Text style={styles.penaltyDetailSmallText}>
//                     -1 point per significant deviation
//                   </Text>
//                 </View>
//               </View>
//             )}
//           </View>
//         </View>
//       </LinearGradient>
//     </View>
//   );
// };

// export default function ResultsScreen({ route, navigation }) {
//   const { sessionId } = route.params;
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [showPenaltyInfo, setShowPenaltyInfo] = useState(false);

//   useEffect(() => {
//     const fetchResults = async () => {
//       try {
//         setLoading(true);
//         const response = await api.student.getResults(sessionId);
        
//         console.log('Results API response:', response.data);
        
//         if (response.data?.results) {
//           // Process results to ensure correct data types
//           const processedResults = response.data.results
//             .map(item => ({
//               ...item,
//               // Ensure numeric values - handle both string and number types
//               total_score: typeof item.total_score === 'string' ? 
//                 parseFloat(item.total_score) : item.total_score || 0,
//               penalty_points: typeof item.penalty_points === 'string' ? 
//                 parseFloat(item.penalty_points) : item.penalty_points || 0,
//               final_score: typeof item.final_score === 'string' ? 
//                 parseFloat(item.final_score) : 
//                 (item.total_score || 0) - (item.penalty_points || 0),
//               biased_questions: item.biased_questions || 0
//             }))
//             // Sort by final_score descending as backup
//             .sort((a, b) => b.final_score - a.final_score);
          
//           setResults(processedResults);
//         } else {
//           setError('No results available for this session');
//         }
//       } catch (err) {
//         setError('Failed to load results');
//         console.error('Results error:', err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchResults();
//   }, [sessionId]);

//   if (loading) {
//     return (
//       <LinearGradient
//         colors={['#667eea', '#764ba2', '#667eea']}
//         style={styles.container}
//       >
//         <View style={styles.loadingContainer}>
//           <View style={styles.loadingCard}>
//             <LinearGradient
//               colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
//               style={styles.loadingCardGradient}
//             >
//               <View style={styles.loadingIconContainer}>
//                 <ActivityIndicator size="large" color="#fff" />
//               </View>
//               <Text style={styles.loadingTitle}>Loading Results</Text>
//               <Text style={styles.loadingSubtitle}>Please wait while we fetch the session results...</Text>
//             </LinearGradient>
//           </View>
//         </View>
//       </LinearGradient>
//     );
//   }

//   if (error) {
//     return (
//       <LinearGradient
//         colors={['#667eea', '#764ba2', '#667eea']}
//         style={styles.container}
//       >
//         <View style={styles.errorContainer}>
//           <LinearGradient
//             colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
//             style={styles.errorCard}
//           >
//             <View style={styles.errorIconContainer}>
//               <Icon name="error-outline" size={64} color="rgba(255,255,255,0.8)" />
//             </View>
//             <Text style={styles.errorTitle}>Unable to Load Results</Text>
//             <Text style={styles.errorSubtitle}>{error}</Text>
//             <TouchableOpacity 
//               style={styles.backButtonContainer}
//               onPress={() => navigation.goBack()}
//             >
//               <LinearGradient
//                 colors={['#F44336', '#D32F2F']}
//                 style={styles.backButtonGradient}
//               >
//                 <Icon name="arrow-back" size={20} color="#fff" />
//                 <Text style={styles.backButtonText}>Go Back</Text>
//               </LinearGradient>
//             </TouchableOpacity>
//           </LinearGradient>
//         </View>
//       </LinearGradient>
//     );
//   }

//     return (
//     <LinearGradient
//       colors={['#667eea', '#764ba2', '#667eea']}
//       style={styles.container}
//     >
//       <View style={styles.contentContainer}>
//         {/* Header Section */}
//         <View style={styles.header}>
//           <View style={styles.headerLeft}>
//             <View>
//               <Text style={styles.title}>Session Results</Text>
//               <Text style={styles.subtitle}>Final rankings and scores</Text>
//             </View>
//           </View>
//           <TouchableOpacity 
//             onPress={() => setShowPenaltyInfo(true)}
//             style={styles.infoButton}
//           >
//             <Icon name="info" size={24} color="rgba(255,255,255,0.8)" />
//           </TouchableOpacity>
//         </View>

//         {/* Stats Section */}
//         <View style={styles.statsContainer}>
//           <LinearGradient
//             colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
//             style={styles.statsGradient}
//           >
//             <View style={styles.statsRow}>
//               <View style={styles.statItem}>
//                 <View style={styles.statIconContainer}>
//                   <Icon name="group" size={24} color="#fff" />
//                 </View>
//                 <Text style={styles.statNumber}>{results.length}</Text>
//                 <Text style={styles.statLabel}>Participants</Text>
//               </View>
//               <View style={styles.statDivider} />
//               <View style={styles.statItem}>
//                 <View style={styles.statIconContainer}>
//                   <Icon name="emoji-events" size={24} color="#FFD700" />
//                 </View>
//                 <Text style={styles.statNumber}>
//                   {results.length > 0 ? results[0].final_score?.toFixed(1) || '0.0' : '0.0'}
//                 </Text>
//                 <Text style={styles.statLabel}>Top Score</Text>
//               </View>
//               <View style={styles.statDivider} />
//               <View style={styles.statItem}>
//                 <View style={styles.statIconContainer}>
//                   <Icon name="check-circle" size={24} color="#4CAF50" />
//                 </View>
//                 <Text style={styles.statNumber}>Completed</Text>
//                 <Text style={styles.statLabel}>Status</Text>
//               </View>
//             </View>
//           </LinearGradient>
//         </View>

//         {/* Results List */}
//         <View style={styles.resultsContainer}>
//           <View style={styles.resultsHeader}>
//             <Text style={styles.resultsTitle}>
//               Final Rankings ({results.length})
//             </Text>
//           </View>
          
//           <View style={styles.resultsList}>
//             {results.length > 0 ? (
//               <FlatList
//                 data={results}
//                 keyExtractor={(item, index) => item.student_id || `result-${index}`}
//                 renderItem={({ item, index }) => <ResultItem item={item} index={index} />}
//                 showsVerticalScrollIndicator={false}
//                 contentContainerStyle={styles.listContent}
//               />
//             ) : (
//               <View style={styles.emptyContainer}>
//                 <LinearGradient
//                   colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
//                   style={styles.emptyGradient}
//                 >
//                   <View style={styles.emptyIconContainer}>
//                     <Icon name="assessment" size={48} color="rgba(255,255,255,0.6)" />
//                   </View>
//                   <Text style={styles.emptyTitle}>No Results Available</Text>
//                   <Text style={styles.emptyText}>
//                     Results for this session are not yet available
//                   </Text>
//                 </LinearGradient>
//               </View>
//             )}
//           </View>
//         </View>

//         {/* Bottom feedback section */}
//         <View style={styles.bottomContainer}>
//           <TouchableOpacity 
//             style={styles.feedbackButton}
//             onPress={() => navigation.navigate('Feedback', { sessionId })}
//             activeOpacity={0.8}
//           >
//             <LinearGradient
//               colors={['#FF6B35', '#F7931E']}
//               start={{x: 0, y: 0}}
//               end={{x: 1, y: 1}}
//               style={styles.feedbackButtonGradient}
//             >
//               <View style={styles.feedbackButtonContent}>
//                 <Icon name="feedback" size={24} color="#fff" />
//                 <Text style={styles.feedbackButtonText}>Give Feedback</Text>
//               </View>
//             </LinearGradient>
//           </TouchableOpacity>
          
//           <Text style={styles.feedbackHint}>
//             Help us improve your experience
//           </Text>
//         </View>
//       </View>

//       {/* Penalty Info Modal */}
// {showPenaltyInfo && (
//   <Modal
//     visible={showPenaltyInfo}
//     transparent={true}
//     animationType="slide"
//     onRequestClose={() => setShowPenaltyInfo(false)}
//   >
//     <View style={styles.modalOverlay}>
//       <LinearGradient
//         colors={['#667eea', '#764ba2']}
//         style={styles.modalContent}
//       >
//         <View style={styles.modalHeader}>
//           <Text style={styles.modalTitle}>Penalty System</Text>
//           <TouchableOpacity 
//             onPress={() => setShowPenaltyInfo(false)}
//             style={styles.closeButton}
//           >
//             <Icon name="close" size={24} color="#fff" />
//           </TouchableOpacity>
//         </View>
        
//         <View style={styles.modalBody}>
//           <Text style={styles.modalDescription}>
//             Penalties are applied when your ratings differ significantly from the group consensus:
//           </Text>
          
//           <View style={styles.penaltyRule}>
//             <Icon name="warning" size={20} color="#FF9800" />
//             <Text style={styles.penaltyRuleText}>
//               Deviation ≥ 2 points from average: -1 point per occurrence
//             </Text>
//           </View>
          
//           <View style={styles.penaltyRule}>
//             <Icon name="info" size={20} color="#2196F3" />
//             <Text style={styles.penaltyRuleText}>
//               Average is calculated excluding self-ratings
//             </Text>
//           </View>
          
//           <View style={styles.penaltyRule}>
//             <Icon name="group" size={20} color="#4CAF50" />
//             <Text style={styles.penaltyRuleText}>
//               Designed to encourage fair and consistent evaluations
//             </Text>
//           </View>
//         </View>
//       </LinearGradient>
//     </View>
//   </Modal>
// )}
//     </LinearGradient>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 40,
//   },
//   loadingCard: {
//     borderRadius: 20,
//     overflow: 'hidden',
//     width: '100%',
//   },
//   loadingCardGradient: {
//     paddingVertical: 40,
//     paddingHorizontal: 32,
//     alignItems: 'center',
//   },
//   loadingIconContainer: {
//     marginBottom: 20,
//   },
//   loadingTitle: {
//     fontSize: 22,
//     fontWeight: '700',
//     color: '#fff',
//     marginBottom: 8,
//     textAlign: 'center',
//   },
//   loadingSubtitle: {
//     fontSize: 16,
//     color: 'rgba(255,255,255,0.8)',
//     textAlign: 'center',
//     lineHeight: 22,
//   },
//   errorContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 40,
//   },
//   errorCard: {
//     borderRadius: 20,
//     padding: 40,
//     alignItems: 'center',
//     width: '100%',
//   },
//   errorIconContainer: {
//     marginBottom: 20,
//   },
//   errorTitle: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: '#fff',
//     marginBottom: 8,
//     textAlign: 'center',
//   },
//   errorSubtitle: {
//     fontSize: 16,
//     color: 'rgba(255,255,255,0.8)',
//     textAlign: 'center',
//     marginBottom: 24,
//     lineHeight: 22,
//   },
//   backButtonContainer: {
//     borderRadius: 12,
//     overflow: 'hidden',
//     width: '100%',
//   },
//   backButtonGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 14,
//     paddingHorizontal: 24,
//   },
//   backButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//     marginLeft: 8,
//   },
//   contentContainer: {
//     flex: 1,
//     padding: 20,
//     paddingTop: 25,
//   },
//   header: {
//     alignItems: 'center',
//     marginBottom: 24,
//   },
//   headerIconContainer: {
//     borderRadius: 30,
//     overflow: 'hidden',
//     marginBottom: 16,
//   },
//   headerIconGradient: {
//     padding: 16,
//   },
//   title: {
//     fontSize: 32,
//     fontWeight: '800',
//     color: '#fff',
//     textAlign: 'center',
//     marginBottom: 8,
//     textShadowColor: 'rgba(0,0,0,0.3)',
//     textShadowOffset: { width: 0, height: 2 },
//     textShadowRadius: 4,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: 'rgba(255,255,255,0.8)',
//     textAlign: 'center',
//     fontWeight: '500',
//   },
//   statsContainer: {
//     borderRadius: 16,
//     overflow: 'hidden',
//     marginBottom: 24,
//   },
//   statsGradient: {
//     padding: 20,
//   },
//   statsRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   statItem: {
//     alignItems: 'center',
//     flex: 1,
//   },
//   statIconContainer: {
//     marginBottom: 8,
//   },
//   statNumber: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#fff',
//     marginBottom: 4,
//   },
//   statLabel: {
//     fontSize: 12,
//     color: 'rgba(255,255,255,0.7)',
//     fontWeight: '500',
//   },
//   statDivider: {
//     width: 1,
//     height: 40,
//     backgroundColor: 'rgba(255,255,255,0.2)',
//     marginHorizontal: 16,
//   },
//   resultsContainer: {
//     flex: 1,
//     marginBottom: 20,
//   },
//   resultsHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   resultsTitle: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#fff',
//   },
//   resultsList: {
//     flex: 1,
//   },
//   listContent: {
//     paddingBottom: 10,
//   },
//   resultItem: {
//     marginBottom: 12,
//     borderRadius: 16,
//     overflow: 'hidden',
//   },
//  rankGradient: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 4,
//   },
//   resultHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   rankContainer: {
//     alignItems: 'center',
//     marginRight: 16,
//     minWidth: 60,
//   },
//    profileImageContainer: {
//     marginRight: 16,
//   },
  
//   profileImage: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     borderWidth: 2,
//     borderColor: 'rgba(255,255,255,0.3)',
//   },
 
//   rankPosition: {
//     fontSize: 12,
//     fontWeight: '600',
//     color: 'rgba(255,255,255,0.8)',
//   },
//   detailsContainer: {
//     flex: 1,
//   },
//   nameText: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#fff',
//     marginBottom: 8,
//   },
//   scoresContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//   },
//   scoreItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flex: 1,
//   },
//   scoreText: {
//     fontSize: 14,
//     color: '#4CAF50',
//     fontWeight: '600',
//     marginLeft: 4,
//   },
//   penaltyText: {
//     fontSize: 14,
//     color: '#F44336',
//     fontWeight: '600',
//     marginLeft: 4,
//   },
//   finalScoreContainer: {
//     alignItems: 'center',
//     backgroundColor: 'rgba(255,255,255,0.2)',
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     paddingVertical: 4,
//   },
//   finalScoreText: {
//     fontSize: 16,
//     fontWeight: '800',
//     color: '#fff',
//   },
//   finalScoreLabel: {
//     fontSize: 10,
//     color: 'rgba(255,255,255,0.7)',
//     fontWeight: '500',
//   },
//   emptyContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     borderRadius: 16,
//     overflow: 'hidden',
//   },
//   emptyGradient: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingVertical: 40,
//     paddingHorizontal: 32,
//   },
//   emptyIconContainer: {
//     marginBottom: 16,
//   },
//   emptyTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#fff',
//     marginBottom: 8,
//     textAlign: 'center',
//   },
//   emptyText: {
//     fontSize: 14,
//     color: 'rgba(255,255,255,0.7)',
//     textAlign: 'center',
//     lineHeight: 20,
//   },
//    bottomContainer: {
//     alignItems: 'center',
//     marginTop: 20,
//   },
//   feedbackButton: {
//     width: '100%',
//     borderRadius: 16,
//     overflow: 'hidden',
//     marginBottom: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 8,
//   },
//   feedbackButtonGradient: {
//     paddingVertical: 18,
//     paddingHorizontal: 24,
//   },
//   feedbackButtonContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   feedbackButtonText: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: '700',
//     marginLeft: 8,
//   },
//   feedbackHint: {
//     fontSize: 14,
//     color: 'rgba(255,255,255,0.6)',
//     textAlign: 'center',
//     fontStyle: 'italic',
//   },
// penaltyIndicator: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: 'rgba(255,152,0,0.2)',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 8,
//     marginBottom: 6,
//     alignSelf: 'flex-start',
//   },
//   penaltyIndicatorText: {
//     color: '#FF9800',
//     fontSize: 12,
//     fontWeight: '600',
//     marginLeft: 4,
//     marginRight: 4,
//   },
//    penaltyDetailItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 4,
//   },
//   penaltyDetailText: {
//     color: '#FF9800',
//     fontSize: 12,
//     fontWeight: '600',
//     marginLeft: 6,
//     flex: 1,
//   },
//   penaltyDetailSmallText: {
//     color: 'rgba(255,152,0,0.8)',
//     fontSize: 11,
//     marginLeft: 6,
//     flex: 1,
//     fontStyle: 'italic',
//   },
//   rankBadge: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   rankText: {
//     color: '#fff',
//     fontWeight: 'bold',
//     fontSize: 18,
//   },
//   profileContainer: {
//     marginRight: 12,
//   },
//   profileImage: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//   },
//   modalOverlay: {
//   flex: 1,
//   backgroundColor: 'rgba(0,0,0,0.7)',
//   justifyContent: 'center',
//   alignItems: 'center',
//   padding: 20,
// },
// modalContent: {
//   borderRadius: 20,
//   padding: 20,
//   width: '90%',
//   maxHeight: '80%',
// },
// modalHeader: {
//   flexDirection: 'row',
//   justifyContent: 'space-between',
//   alignItems: 'center',
//   marginBottom: 20,
// },
// modalTitle: {
//   fontSize: 20,
//   fontWeight: '700',
//   color: '#fff',
// },
// closeButton: {
//   padding: 4,
// },
// modalBody: {
//   gap: 16,
// },
// penaltyRule: {
//   flexDirection: 'row',
//   alignItems: 'center',
//   backgroundColor: 'rgba(255,255,255,0.1)',
//   padding: 12,
//   borderRadius: 12,
// },
// penaltyRuleText: {
//   color: '#fff',
//   fontSize: 14,
//   marginLeft: 12,
//   flex: 1,
// },
// headerLeft: {
//   flexDirection: 'row',
//   alignItems: 'center',
//   flex: 1,
// },
// infoButton: {
//   padding: 8,
// },
//   penaltyInfoButton: {
//     marginLeft: 4,
//     padding: 4,
//   },
//   penaltyDetailsContainer: {
//     marginTop: 8,
//     padding: 8,
//     backgroundColor: 'rgba(255,152,0,0.1)',
//     borderRadius: 6,
//     borderWidth: 1,
//     borderColor: 'rgba(255,152,0,0.3)',
//   },
// });





// // import React, { useState, useEffect } from 'react';
// // import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
// // import api from '../services/api';

// // const ResultItem = ({ item, index }) => {
// //   // Ensure numeric values
// //   const totalScore = typeof item.total_score === 'string' ? 
// //     parseFloat(item.total_score) : item.total_score || 0;
// //   const penaltyPoints = typeof item.penalty_points === 'string' ? 
// //     parseFloat(item.penalty_points) : item.penalty_points || 0;
// //   const finalScore = typeof item.final_score === 'string' ? 
// //     parseFloat(item.final_score) : totalScore - penaltyPoints;

// //   return (
// //     <View style={styles.resultItem}>
// //       <View style={styles.rankContainer}>
// //         <Text style={styles.rankText}>
// //           {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
// //         </Text>
// //       </View>
// //       <View style={styles.detailsContainer}>
// //         <Text style={styles.nameText}>{item.name}</Text>
// //         <View style={styles.scoresContainer}>
// //           <Text style={styles.scoreText}>Score: {totalScore.toFixed(1)}</Text>
// //           <Text style={styles.penaltyText}>Penalties: -{penaltyPoints.toFixed(1)}</Text>
// //           <Text style={styles.finalScoreText}>Final: {finalScore.toFixed(1)}</Text>
// //         </View>
// //       </View>
// //     </View>
// //   );
// // };

// // export default function ResultsScreen({ route, navigation }) {
// //   const { sessionId } = route.params;
// //   const [results, setResults] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [error, setError] = useState(null);
// //   const [showFeedbackButton, setShowFeedbackButton] = useState(false);

// //   useEffect(() => {
// //     const fetchResults = async () => {
// //       try {
// //         setLoading(true);
// //         const response = await api.student.getResults(sessionId);
        
// //         if (response.data?.results) {
// //           // Process results to ensure correct sorting and numeric values
// //           const processedResults = response.data.results
// //             .map(item => ({
// //               ...item,
// //               total_score: typeof item.total_score === 'string' ? 
// //                 parseFloat(item.total_score) : item.total_score || 0,
// //               penalty_points: typeof item.penalty_points === 'string' ? 
// //                 parseFloat(item.penalty_points) : item.penalty_points || 0,
// //               final_score: typeof item.final_score === 'string' ? 
// //                 parseFloat(item.final_score) : 
// //                 (item.total_score || 0) - (item.penalty_points || 0)
// //             }))
// //             // Sort by final score descending
// //             .sort((a, b) => b.final_score - a.final_score);
          
// //           setResults(processedResults);
// //           setShowFeedbackButton(true);
// //         } else {
// //           setError('No results available for this session');
// //         }
// //       } catch (err) {
// //         setError('Failed to load results');
// //         console.error('Results error:', err);
// //       } finally {
// //         setLoading(false);
// //       }
// //     };

// //     fetchResults();
// //   }, [sessionId]);


// //   const handleFeedbackPress = () => {
// //     navigation.navigate('Feedback', { sessionId });
// //   };

// //   if (loading) {
// //     return (
// //       <View style={styles.container}>
// //         <ActivityIndicator size="large" />
// //         <Text style={styles.loadingText}>Loading session results...</Text>
// //       </View>
// //     );
// //   }

// //   if (error) {
// //     return (
// //       <View style={styles.container}>
// //         <Text style={styles.errorText}>{error}</Text>
// //       </View>
// //     );
// //   }

// //   return (
// //     <View style={styles.container}>
// //       <Text style={styles.header}>Session Results</Text>
      
// //       <FlatList
// //         data={results}
// //         keyExtractor={item => item.responder_id}
// //         renderItem={({ item, index }) => <ResultItem item={item} index={index} />}
// //         contentContainerStyle={styles.listContainer}
// //         ListEmptyComponent={
// //           <View style={styles.emptyContainer}>
// //             <Text style={styles.emptyText}>No results available for this session</Text>
// //           </View>
// //         }
// //       />

// //       {showFeedbackButton && (
// //         <TouchableOpacity 
// //           style={styles.feedbackButton}
// //           onPress={handleFeedbackPress}
// //         >
// //           <Text style={styles.feedbackButtonText}>Provide Feedback</Text>
// //         </TouchableOpacity>
// //       )}
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     padding: 20,
// //     backgroundColor: '#f5f5f5',
// //   },
// //   header: {
// //     fontSize: 22,
// //     fontWeight: 'bold',
// //     marginBottom: 20,
// //     textAlign: 'center',
// //     color: '#333',
// //   },
// //   loadingText: {
// //     marginTop: 10,
// //     textAlign: 'center',
// //     color: '#666',
// //   },
// //   errorText: {
// //     color: 'red',
// //     fontSize: 16,
// //     textAlign: 'center',
// //   },
// //   listContainer: {
// //     paddingBottom: 20,
// //   },
// //   resultItem: {
// //     flexDirection: 'row',
// //     backgroundColor: '#fff',
// //     borderRadius: 8,
// //     padding: 15,
// //     marginBottom: 10,
// //     elevation: 2,
// //   },
// //   rankContainer: {
// //     width: 50,
// //     justifyContent: 'center',
// //     alignItems: 'center',
// //   },
// //   rankText: {
// //     fontSize: 20,
// //     fontWeight: 'bold',
// //   },
// //   detailsContainer: {
// //     flex: 1,
// //   },
// //   nameText: {
// //     fontSize: 16,
// //     fontWeight: 'bold',
// //     marginBottom: 5,
// //   },
// //   scoresContainer: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-between',
// //   },
// //   scoreText: {
// //     color: '#4CAF50',
// //   },
// //   penaltyText: {
// //     color: '#F44336',
// //   },
// //   finalScoreText: {
// //     fontWeight: 'bold',
// //     color: '#2196F3',
// //   },
// //   emptyContainer: {
// //     alignItems: 'center',
// //     padding: 20,
// //   },
// //   emptyText: {
// //     color: '#666',
// //     fontStyle: 'italic',
// //   },
// //   feedbackButton: {
// //     backgroundColor: '#2196F3',
// //     padding: 15,
// //     borderRadius: 8,
// //     alignItems: 'center',
// //     marginTop: 10,
// //     marginBottom: 20,
// //   },
// //   feedbackButtonText: {
// //     color: 'white',
// //     fontWeight: 'bold',
// //     fontSize: 16,
// //   },
// // });