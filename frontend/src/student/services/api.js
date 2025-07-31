import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: Platform.OS === 'android' 
    ? 'http://10.150.253.242:8080' 
    : 'http://localhost:8080',
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      const cleanToken = token.replace(/['"]+/g, '').trim();
      config.headers.Authorization = `Bearer ${cleanToken}`;
    } else {
      // Don't throw error, just continue without token
      console.log('No token available - proceeding without authorization');
    }
  } catch (error) {
    console.error('Error getting token:', error);
    // Don't throw error, just continue without token
  }
  return config;
}, error => {
  return Promise.reject(error);
});

api.interceptors.response.use(response => {
  console.log('Response received:', {
    status: response.status,
    url: response.config.url
  });
  
  // Handle database errors more safely
  if (response.data?.error && typeof response.data.error === 'string' && 
      response.data.error.includes('Database')) {
    return Promise.reject(new Error('Database operation failed'));
  }
  
  return response;
}, error => {
  // Skip logging for 403 errors on booking attempts
  if (error.response?.status !== 403 || !error.config.url.includes('/student/sessions/book')) {
    console.error('API Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
  }

  // Handle error message more safely
  if (error.response?.data?.error && typeof error.response.data.error === 'string' && 
      !error.response.data.error.includes('Database')) {
    console.error('API Error:', error);
  }
  
  return Promise.reject(error);
});

api.student = {
  login: (email, password) => api.post('/student/login', { email, password }),
  getSessions: (level) => api.get(`/student/sessions?level=${level}`),
   getSession: (sessionId) => api.get(`/student/session?session_id=${sessionId}`),
  joinSession: (data) => {
    console.log('Making join session request with data:', data);
    return api.post('/student/sessions/join', data, {
      validateStatus: function (status) {
        console.log('Received status:', status);
        return true; // Always resolve to handle all status codes
      },
      transformResponse: [
        function (data) {
          console.log('Raw response data:', data);
          try {
            // Handle case where backend might return plain text error
            if (typeof data === 'string' && data.includes('error')) {
              return { error: data };
            }
            const parsed = JSON.parse(data);
            console.log('Parsed response:', parsed);
            return parsed;
          } catch (e) {
            console.error('Response parsing error:', e);
            return { error: 'Invalid server response' };
          }
        }
      ]
    }).catch(error => {
      console.error('Join session API error:', {
        message: error.message,
        response: error.response?.data,
        config: error.config
      });
      throw error;
    });
  },
getSessionParticipants: (sessionId) => {
  return api.get('/student/session/participants', { 
    params: { session_id: sessionId },
    transformResponse: [
      function (data) {
        try {
          // Handle empty responses
          if (!data) {
            return { data: [] };
          }
          
          // Handle non-JSON responses (like plain text errors)
          if (typeof data === 'string') {
            try {
              return JSON.parse(data);
            } catch (e) {
              return { 
                error: data,
                data: [] 
              };
            }
          }
          
          // Handle proper JSON responses
          const parsed = typeof data === 'object' ? data : JSON.parse(data);
          return {
            ...parsed,
            data: parsed.data || []
          };
        } catch (e) {
          console.error('Response parsing error:', e);
          return { data: [] };
        }
      }
    ],
    validateStatus: function (status) {
      // Accept all status codes
      return true;
    }
  }).catch(error => {
    console.error('Participants API error:', error);
    return { data: [] };
  });
},
submitSurvey: (data) => {
    console.log('Submitting survey with data:', data);
    return api.post('/student/survey', {
      session_id: data.sessionId,
      responses: Object.keys(data.responses).reduce((acc, questionIndex) => {
        const questionNum = parseInt(questionIndex);
        const rankings = data.responses[questionIndex];
        
        // Convert rankings to the expected format (rank -> student_id)
        const formattedRankings = {};
        Object.keys(rankings).forEach(rank => {
          const rankNum = parseInt(rank);
          if (rankings[rank]) {  // Only include if there's a value
            formattedRankings[rankNum] = rankings[rank];
          }
        });
        
        // Only include if there are rankings
        if (Object.keys(formattedRankings).length > 0) {
          acc[questionNum] = formattedRankings;
        }
        return acc;
      }, {})
    }, {
      validateStatus: function (status) {
        return status < 500; // Reject only if status is 500 or higher
      }
    }).catch(error => {
      console.error("Error submitting survey:", error);
      throw error;
    });
  },
  bookVenue: (venueId) => api.post('/student/sessions/book', { venue_id: venueId }),
  checkBooking: (venueId) => api.get('/student/session/check', { params: { venue_id: venueId } }),
  cancelBooking: (venueId) => api.delete('/student/session/cancel', { data: { venue_id: venueId } }),
  
};

export default api;
