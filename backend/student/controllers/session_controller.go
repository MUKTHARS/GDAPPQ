package controllers

import (
	// "bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"gd/database"
	"math"
	"sort"

	// "sort"

	// "io"

	// "sort"

	// "gd/student/models"
	"log"
	"net/http"
	"net/url"
	"strconv"
	// "strings"
	"time"

	"github.com/google/uuid"
)

type SessionDetails struct {
	ID           string    `json:"id"`
	Venue        string    `json:"venue"`
	Topic        string    `json:"topic"`
	PrepTime     int       `json:"prep_time"`
	Discussion   int       `json:"discussion_time"`
	StartTime    time.Time `json:"start_time"`
	Participants []string  `json:"participants"`
}

type BookingRequest struct {
	VenueID   string `json:"venue_id"`
	StudentID string `json:"student_id"`
}

type SurveyResponse struct {
	Question int            `json:"question"`
	Rankings map[int]string `json:"rankings"`
}

func GetSessionDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "session_id is required"})
		return
	}

	studentID := r.Context().Value("studentID").(string)
	log.Printf("Fetching session %s for student %s", sessionID, studentID)

	// First verify the student is part of this session
	var isParticipant bool
	err := database.GetDB().QueryRow(`
        SELECT EXISTS(
            SELECT 1 FROM session_participants 
            WHERE session_id = ? AND student_id = ? AND is_dummy = FALSE
        )`, sessionID, studentID).Scan(&isParticipant)

	if err != nil {
		log.Printf("Database error checking participant: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	if !isParticipant {
		log.Printf("Student %s not authorized for session %s", studentID, sessionID)
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authorized to view this session"})
		return
	}

	// Get session details with proper error handling
	var (
		id           string
		venue        string
		topic        sql.NullString
		agendaJSON   []byte
		startTimeStr string
	)

	err = database.GetDB().QueryRow(`
        SELECT s.id, v.name, s.topic, s.agenda, s.start_time
        FROM gd_sessions s
        JOIN venues v ON s.venue_id = v.id
        WHERE s.id = ?`, sessionID).Scan(
		&id, &venue, &topic, &agendaJSON, &startTimeStr,
	)

	if err != nil {
		log.Printf("Database error fetching session: %v", err)
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Session not found"})
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		}
		return
	}

	// Parse start_time from string
	startTime, err := time.Parse("2006-01-02 15:04:05", startTimeStr)
	if err != nil {
		log.Printf("Error parsing start_time: %v", err)
		startTime = time.Now() // Fallback to current time if parsing fails
	}

	// Parse agenda with defaults
	var agenda struct {
		PrepTime   int `json:"prep_time"`
		Discussion int `json:"discussion"`
		Survey     int `json:"survey"`
	}

	// Set default values
	agenda.PrepTime = 1
	agenda.Discussion = 1
	agenda.Survey = 1

	if len(agendaJSON) > 0 {
		if err := json.Unmarshal(agendaJSON, &agenda); err != nil {
			log.Printf("Error parsing agenda JSON: %v", err)
			// Use defaults if parsing fails
		} else {
			// Ensure values are in minutes (not seconds)
			if agenda.Discussion > 5 { // If somehow seconds got stored
				agenda.Discussion = agenda.Discussion / 5
			}
		}
	}

	response := map[string]interface{}{
		"id":              id,
		"venue":           venue,
		"topic":           topic.String,
		"prep_time":       agenda.PrepTime,
		"discussion_time": agenda.Discussion,
		"survey_time":     agenda.Survey,
		"start_time":      startTime,
	}

	log.Printf("Successfully fetched session %s", sessionID)
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding session response: %v", err)
	}
}

////////////////

func JoinSession(w http.ResponseWriter, r *http.Request) {
	log.Println("JoinSession endpoint hit")
	var qrCapacity struct {
		ID           string
		MaxCapacity  int
		CurrentUsage int
		IsActive     bool
		QRGroupID    string
	}

	var request struct {
		QRData string `json:"qr_data"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		log.Printf("JoinSession decode error: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
		return
	}

	if request.QRData == "" {
		log.Println("Empty QR data received")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "QR data is required"})
		return
	}

	studentID := r.Context().Value("studentID").(string)
	log.Printf("JoinSession request for student %s", studentID)

	// Parse QR data
	var qrPayload struct {
		VenueID string `json:"venue_id"`
		Expiry  string `json:"expiry"`
	}
	if err := json.Unmarshal([]byte(request.QRData), &qrPayload); err != nil {
		log.Printf("QR data parsing error: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid QR code format"})
		return
	}

	log.Printf("QR payload parsed - VenueID: %s, Expiry: %s", qrPayload.VenueID, qrPayload.Expiry)

	// Verify QR code against database and get QR details
	err := database.GetDB().QueryRow(`
        SELECT id, max_capacity, current_usage, is_active, qr_group_id
        FROM venue_qr_codes 
        WHERE qr_data = ? AND venue_id = ?`,
		request.QRData, qrPayload.VenueID).Scan(&qrCapacity.ID, &qrCapacity.MaxCapacity,
		&qrCapacity.CurrentUsage, &qrCapacity.IsActive, &qrCapacity.QRGroupID)

	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("No active QR code found for venue %s", qrPayload.VenueID)
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid or expired QR code"})
		} else {
			log.Printf("QR capacity check error: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "QR code validation failed"})
		}
		return
	}

	if !qrCapacity.IsActive {
		log.Printf("QR code is not active")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "QR code is no longer active"})
		return
	}

	if qrCapacity.CurrentUsage >= qrCapacity.MaxCapacity {
		log.Printf("QR code is full: %d/%d", qrCapacity.CurrentUsage, qrCapacity.MaxCapacity)
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "This QR code has reached its capacity limit"})
		return
	}

	// Increment QR usage
	_, err = database.GetDB().Exec(`
        UPDATE venue_qr_codes 
        SET current_usage = current_usage + 1 
        WHERE id = ?`,
		qrCapacity.ID)

	if err != nil {
		log.Printf("Failed to update QR usage: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to join session"})
		return
	}

	// Find or create session for this specific QR group
	var sessionID string
	tx, err := database.GetDB().Begin()
	if err != nil {
		log.Printf("Failed to begin transaction: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	defer tx.Rollback()

	// First clear any old phase tracking for this student
	_, err = tx.Exec(`
        DELETE FROM session_phase_tracking 
        WHERE student_id = ?`,
		studentID)
	if err != nil {
		log.Printf("Failed to clear old phase tracking: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to join session"})
		return
	}

	// First check if there's an active session for this QR group
	err = tx.QueryRow(`
        SELECT id FROM gd_sessions 
        WHERE venue_id = ? AND qr_group_id = ? AND status IN ('pending', 'active')
        ORDER BY created_at DESC LIMIT 1`,
		qrPayload.VenueID, qrCapacity.QRGroupID).Scan(&sessionID)

	if err != nil && err != sql.ErrNoRows {
		log.Printf("Database error finding venue session: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	// If no session exists, create one with the QR group ID
	if err == sql.ErrNoRows {
		sessionID = uuid.New().String()
		_, err = tx.Exec(`
            INSERT INTO gd_sessions 
            (id, venue_id, status, start_time, end_time, level, qr_group_id) 
            VALUES (?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 HOUR), 
                   (SELECT level FROM venues WHERE id = ?), ?)`,
			sessionID, qrPayload.VenueID, qrPayload.VenueID, qrCapacity.QRGroupID)
		if err != nil {
			log.Printf("Failed to create session: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create session"})
			return
		}
		log.Printf("Created new session %s for venue %s with QR group %s", sessionID, qrPayload.VenueID, qrCapacity.QRGroupID)
	}

	// Check if student is already in this session
	var isParticipant bool
	err = tx.QueryRow(`
        SELECT EXISTS(
            SELECT 1 FROM session_participants 
            WHERE session_id = ? AND student_id = ? AND is_dummy = FALSE
        )`, sessionID, studentID).Scan(&isParticipant)

	if err != nil {
		log.Printf("Database error checking participation: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	if !isParticipant {
		// Add student to session
		_, err = tx.Exec(`
            INSERT INTO session_participants 
            (id, session_id, student_id, is_dummy) 
            VALUES (UUID(), ?, ?, FALSE)`,
			sessionID, studentID)

		if err != nil {
			log.Printf("Failed to add participant: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to join session"})
			return
		}
		log.Printf("Added student %s to session %s as participant", studentID, sessionID)
	}

	// Add phase tracking (marks QR code scanned)
	_, err = tx.Exec(`
        INSERT INTO session_phase_tracking 
        (session_id, student_id, phase, start_time)
        VALUES (?, ?, 'prep', NOW())`,
		sessionID, studentID)

	if err != nil {
		log.Printf("Failed to update phase tracking: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update session phase"})
		return
	}
	log.Printf("Updated phase tracking for student %s in session %s", studentID, sessionID)

	// Update session status to active if not already
	_, err = tx.Exec(`
        UPDATE gd_sessions 
        SET status = 'active' 
        WHERE id = ? AND status = 'pending'`,
		sessionID)
	if err != nil {
		log.Printf("Failed to activate session: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to activate session"})
		return
	}

	if err := tx.Commit(); err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to join session"})
		return
	}

	log.Printf("Successfully joined session %s for student %s", sessionID, studentID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":     "joined",
		"session_id": sessionID,
	})
}

func getSessionParticipantCount(sessionID string) (int, error) {
    var participantCount int
    err := database.GetDB().QueryRow(`
        SELECT COUNT(DISTINCT student_id)
        FROM session_participants 
        WHERE session_id = ? AND is_dummy = FALSE`,
        sessionID).Scan(&participantCount)
    
    if err != nil {
        return 0, err
    }
    return participantCount, nil
}

func SubmitSurvey(w http.ResponseWriter, r *http.Request) {
    studentID := r.Context().Value("studentID").(string)
    log.Printf("SubmitSurvey started for student %s", studentID)

    var req struct {
        SessionID string                 `json:"session_id"`
        Responses map[int]map[int]string `json:"responses"` // question_number -> rank -> studentID
        IsPartial bool                   `json:"is_partial"`
        IsFinal   bool                   `json:"is_final"`
    }

    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        log.Printf("Survey decode error: %v", err)
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
        return
    }

    tx, err := database.GetDB().Begin()
    if err != nil {
        log.Printf("Failed to begin transaction: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }
    defer tx.Rollback()

    // Get session level first
    var sessionLevel int
    err = tx.QueryRow("SELECT level FROM gd_sessions WHERE id = ?", req.SessionID).Scan(&sessionLevel)
    if err != nil {
        log.Printf("Error getting session level: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }

    // Get all active questions for this level with their IDs and weights, ordered by display_order
    rows, err := tx.Query(`
        SELECT id, weight 
        FROM survey_questions 
        WHERE level = ? AND is_active = TRUE 
        ORDER BY display_order`,
        sessionLevel)
    if err != nil {
        log.Printf("Error getting questions: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }
    defer rows.Close()

    // Create a mapping of question number to question ID and weight
    questionMappings := make(map[int]struct {
        ID     string
        Weight float64
    })

    index := 1
    for rows.Next() {
        var questionID string
        var weight float64
        if err := rows.Scan(&questionID, &weight); err != nil {
            continue
        }
        questionMappings[index] = struct {
            ID     string
            Weight float64
        }{
            ID:     questionID,
            Weight: weight,
        }
        log.Printf("Question %d: ID=%s, Weight=%.2f", index, questionID, weight)
        index++
    }

    totalQuestions := len(questionMappings)
    log.Printf("Total questions for level %d: %d", sessionLevel, totalQuestions)

    // Track incomplete rankings for penalty calculation
    incompleteRankings := make(map[string]int) // question_id -> missing_ranks_count

    // Process each question response
    for questionNumber, rankings := range req.Responses {
        // Get question mapping
        questionMapping, exists := questionMappings[questionNumber]
        if !exists {
            log.Printf("Question mapping not found for question number %d, skipping", questionNumber)
            continue
        }

        log.Printf("Processing question %d with ID %s and weight %.2f", questionNumber, questionMapping.ID, questionMapping.Weight)

        // Clear previous responses for this question and responder if any
        _, err = tx.Exec(`
            DELETE FROM survey_results 
            WHERE session_id = ? AND responder_id = ? AND question_id = ?`,
            req.SessionID, studentID, questionMapping.ID)
        if err != nil {
            log.Printf("Error clearing previous responses: %v", err)
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
            return
        }

        // Check if rankings are complete (should have 3 ranks for 3 participants)
       expectedRanks := 3 // Default fallback
participantCount, err := getSessionParticipantCount(req.SessionID)
if err != nil {
    log.Printf("Error getting participant count: %v, using default 3", err)
} else {
    expectedRanks = participantCount - 1 // Exclude self-rating
    if expectedRanks < 1 {
        expectedRanks = 1 // Ensure at least 1 rank is expected
    }
    log.Printf("Session %s has %d participants, expecting %d ranks per question", 
        req.SessionID, participantCount, expectedRanks)
}

actualRanks := len(rankings)
if actualRanks < expectedRanks {
    missingRanks := expectedRanks - actualRanks
    incompleteRankings[questionMapping.ID] = missingRanks
    log.Printf("Student %s has incomplete rankings for question %s: %d/%d ranks", 
        studentID, questionMapping.ID, actualRanks, expectedRanks)
}

        // Save new rankings with proper question_id foreign key
        for rank, rankedStudentID := range rankings {
            // Get base points from configurable ranking points
            basePoints, err := getRankingPoints(sessionLevel, rank)
            if err != nil {
                log.Printf("Error getting ranking points: %v", err)
                // Fallback to default calculation if config not found
                basePoints = 5 - float64(rank) // 1st=4, 2nd=3, 3rd=2
            }

            // Calculate final score as points × weight
            finalScore := basePoints * questionMapping.Weight

            log.Printf("Saving: responder %s ranked student %s as rank %d with score %.2f for question %s",
                studentID, rankedStudentID, rank, finalScore, questionMapping.ID)

            _, err = tx.Exec(`
                INSERT INTO survey_results 
                (id, session_id, student_id, responder_id, question_id, ranks, score, weighted_score, is_current_session, is_completed)
                VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
                req.SessionID, rankedStudentID, studentID, questionMapping.ID, rank, finalScore, finalScore)
            if err != nil {
                tx.Rollback()
                log.Printf("Error saving survey response: %v", err)
                w.WriteHeader(http.StatusInternalServerError)
                json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save survey response"})
                return
            }
        }
    }

    // Apply penalties for incomplete rankings (1 point per missing rank)
    totalPenalty := 0.0
    for questionID, missingRanks := range incompleteRankings {
        penaltyPoints := float64(missingRanks) // 1 point per missing rank
        totalPenalty += penaltyPoints
        
        log.Printf("Applying penalty of %.1f points for %d missing ranks in question %s", 
            penaltyPoints, missingRanks, questionID)
        
        // Apply penalty to the student's record for this question
        _, err = tx.Exec(`
            UPDATE survey_results 
            SET penalty_points = penalty_points + ?,
                is_biased = TRUE,
                penalty_calculated = TRUE
            WHERE session_id = ? AND responder_id = ? AND question_id = ?`,
            penaltyPoints, req.SessionID, studentID, questionID)
        
        if err != nil {
            log.Printf("Error applying incomplete ranking penalty: %v", err)
            // Continue with other penalties instead of failing
        }
    }

    if totalPenalty > 0 {
        log.Printf("Total penalty of %.1f points applied to student %s for incomplete rankings", 
            totalPenalty, studentID)
    }

    // Check if ALL questions have been answered by counting responses
    var answeredQuestionsCount int
    err = tx.QueryRow(`
        SELECT COUNT(DISTINCT question_id) 
        FROM survey_results 
        WHERE session_id = ? AND responder_id = ?`,
        req.SessionID, studentID).Scan(&answeredQuestionsCount)

    if err != nil {
        log.Printf("Error counting answered questions: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }

    log.Printf("Student %s has answered %d out of %d questions", studentID, answeredQuestionsCount, totalQuestions)

    // Only mark as completed if ALL questions are answered
    if answeredQuestionsCount >= totalQuestions {
        log.Printf("All questions completed for student %s in session %s", studentID, req.SessionID)

        // Mark survey as completed in survey_completion table
        _, err = tx.Exec(`
            INSERT INTO survey_completion (session_id, student_id, completed_at)
            VALUES (?, ?, NOW())
            ON DUPLICATE KEY UPDATE completed_at = NOW()`,
            req.SessionID, studentID)

        if err != nil {
            log.Printf("Error marking survey completion: %v", err)
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Failed to mark survey completion"})
            return
        }

        // Update all survey_results records for this student to mark as completed
        _, err = tx.Exec(`
            UPDATE survey_results 
            SET is_completed = 1 
            WHERE session_id = ? AND responder_id = ?`,
            req.SessionID, studentID)
        if err != nil {
            log.Printf("Error updating survey_results completion status: %v", err)
            // Don't fail the whole request for this
        }

        log.Printf("Survey marked as completed for student %s in session %s", studentID, req.SessionID)
    } else {
        log.Printf("Survey not yet completed for student %s (%d/%d questions)",
            studentID, answeredQuestionsCount, totalQuestions)
    }

    if err := tx.Commit(); err != nil {
        log.Printf("Error committing transaction: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save survey"})
        return
    }

    if answeredQuestionsCount >= totalQuestions {
        log.Printf("All questions completed, calculating averages for session %s", req.SessionID)
        
        // Get all question IDs for this session
        var questionIDs []string
        rows, err := database.GetDB().Query(`
            SELECT DISTINCT question_id 
            FROM survey_results 
            WHERE session_id = ? AND is_completed = 1`,
            req.SessionID)
        if err != nil {
            log.Printf("Error getting question IDs: %v", err)
        } else {
            defer rows.Close()
            for rows.Next() {
                var questionID string
                if err := rows.Scan(&questionID); err != nil {
                    continue
                }
                questionIDs = append(questionIDs, questionID)
            }
            
            // Calculate averages for each question
            for _, questionID := range questionIDs {
                if err := calculateQuestionAverages(req.SessionID, questionID); err != nil {
                    log.Printf("Error calculating averages for question %s: %v", questionID, err)
                }
            }
            
            // Now calculate penalties for biased ratings
            if err := calculatePenalties(req.SessionID); err != nil {
                log.Printf("Error calculating penalties: %v", err)
            }
        }
    }

    log.Printf("Successfully processed survey submission for student %s in session %s",
        studentID, req.SessionID)
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "status":             "success",
        "completed":          answeredQuestionsCount >= totalQuestions,
        "questions_answered": answeredQuestionsCount,
        "total_questions":    totalQuestions,
        "incomplete_penalty": totalPenalty,
        "incomplete_questions": len(incompleteRankings),
    })
}

// func SubmitSurvey(w http.ResponseWriter, r *http.Request) {
// 	studentID := r.Context().Value("studentID").(string)
// 	log.Printf("SubmitSurvey started for student %s", studentID)

// 	var req struct {
// 		SessionID string                 `json:"session_id"`
// 		Responses map[int]map[int]string `json:"responses"` // question_number -> rank -> studentID
// 		IsPartial bool                   `json:"is_partial"`
// 		IsFinal   bool                   `json:"is_final"`
// 	}

// 	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
// 		log.Printf("Survey decode error: %v", err)
// 		w.WriteHeader(http.StatusBadRequest)
// 		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
// 		return
// 	}

// 	tx, err := database.GetDB().Begin()
// 	if err != nil {
// 		log.Printf("Failed to begin transaction: %v", err)
// 		w.WriteHeader(http.StatusInternalServerError)
// 		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
// 		return
// 	}
// 	defer tx.Rollback()

// 	// Get session level first
// 	var sessionLevel int
// 	err = tx.QueryRow("SELECT level FROM gd_sessions WHERE id = ?", req.SessionID).Scan(&sessionLevel)
// 	if err != nil {
// 		log.Printf("Error getting session level: %v", err)
// 		w.WriteHeader(http.StatusInternalServerError)
// 		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
// 		return
// 	}

// 	// Get all active questions for this level with their IDs and weights, ordered by display_order
// 	rows, err := tx.Query(`
//         SELECT id, weight 
//         FROM survey_questions 
//         WHERE level = ? AND is_active = TRUE 
//         ORDER BY display_order`,
// 		sessionLevel)
// 	if err != nil {
// 		log.Printf("Error getting questions: %v", err)
// 		w.WriteHeader(http.StatusInternalServerError)
// 		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
// 		return
// 	}
// 	defer rows.Close()

// 	// Create a mapping of question number to question ID and weight
// 	questionMappings := make(map[int]struct {
// 		ID     string
// 		Weight float64
// 	})

// 	index := 1
// 	for rows.Next() {
// 		var questionID string
// 		var weight float64
// 		if err := rows.Scan(&questionID, &weight); err != nil {
// 			continue
// 		}
// 		questionMappings[index] = struct {
// 			ID     string
// 			Weight float64
// 		}{
// 			ID:     questionID,
// 			Weight: weight,
// 		}
// 		log.Printf("Question %d: ID=%s, Weight=%.2f", index, questionID, weight)
// 		index++
// 	}

// 	totalQuestions := len(questionMappings)
// 	log.Printf("Total questions for level %d: %d", sessionLevel, totalQuestions)

// 	// Process each question response
// 	for questionNumber, rankings := range req.Responses {
// 		// Get question mapping
// 		questionMapping, exists := questionMappings[questionNumber]
// 		if !exists {
// 			log.Printf("Question mapping not found for question number %d, skipping", questionNumber)
// 			continue
// 		}

// 		log.Printf("Processing question %d with ID %s and weight %.2f", questionNumber, questionMapping.ID, questionMapping.Weight)

// 		// Clear previous responses for this question and responder if any
// 		_, err = tx.Exec(`
//             DELETE FROM survey_results 
//             WHERE session_id = ? AND responder_id = ? AND question_id = ?`,
// 			req.SessionID, studentID, questionMapping.ID)
// 		if err != nil {
// 			log.Printf("Error clearing previous responses: %v", err)
// 			w.WriteHeader(http.StatusInternalServerError)
// 			json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
// 			return
// 		}

// 		// Save new rankings with proper question_id foreign key
// 		for rank, rankedStudentID := range rankings {
// 			// Get base points from configurable ranking points
// 			basePoints, err := getRankingPoints(sessionLevel, rank)
// 			if err != nil {
// 				log.Printf("Error getting ranking points: %v", err)
// 				// Fallback to default calculation if config not found
// 				basePoints = 5 - float64(rank) // 1st=4, 2nd=3, 3rd=2
// 			}

// 			// Calculate final score as points × weight
// 			finalScore := basePoints * questionMapping.Weight

// 			log.Printf("Saving: responder %s ranked student %s as rank %d with score %.2f for question %s",
// 				studentID, rankedStudentID, rank, finalScore, questionMapping.ID)

// 			_, err = tx.Exec(`
//                 INSERT INTO survey_results 
//                 (id, session_id, student_id, responder_id, question_id, ranks, score, weighted_score, is_current_session, is_completed)
//                 VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
// 				req.SessionID, rankedStudentID, studentID, questionMapping.ID, rank, finalScore, finalScore)
// 			if err != nil {
// 				tx.Rollback()
// 				log.Printf("Error saving survey response: %v", err)
// 				w.WriteHeader(http.StatusInternalServerError)
// 				json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save survey response"})
// 				return
// 			}
// 		}
// 	}

// 	// Check if ALL questions have been answered by counting responses
// 	var answeredQuestionsCount int
// 	err = tx.QueryRow(`
//         SELECT COUNT(DISTINCT question_id) 
//         FROM survey_results 
//         WHERE session_id = ? AND responder_id = ?`,
// 		req.SessionID, studentID).Scan(&answeredQuestionsCount)

// 	if err != nil {
// 		log.Printf("Error counting answered questions: %v", err)
// 		w.WriteHeader(http.StatusInternalServerError)
// 		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
// 		return
// 	}

// 	log.Printf("Student %s has answered %d out of %d questions", studentID, answeredQuestionsCount, totalQuestions)

// 	// Only mark as completed if ALL questions are answered
// 	if answeredQuestionsCount >= totalQuestions {
// 		log.Printf("All questions completed for student %s in session %s", studentID, req.SessionID)

// 		// Mark survey as completed in survey_completion table
// 		_, err = tx.Exec(`
//             INSERT INTO survey_completion (session_id, student_id, completed_at)
//             VALUES (?, ?, NOW())
//             ON DUPLICATE KEY UPDATE completed_at = NOW()`,
// 			req.SessionID, studentID)

// 		if err != nil {
// 			log.Printf("Error marking survey completion: %v", err)
// 			w.WriteHeader(http.StatusInternalServerError)
// 			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to mark survey completion"})
// 			return
// 		}

// 		// Update all survey_results records for this student to mark as completed
// 		_, err = tx.Exec(`
//             UPDATE survey_results 
//             SET is_completed = 1 
//             WHERE session_id = ? AND responder_id = ?`,
// 			req.SessionID, studentID)
// 		if err != nil {
// 			log.Printf("Error updating survey_results completion status: %v", err)
// 			// Don't fail the whole request for this
// 		}

// 		log.Printf("Survey marked as completed for student %s in session %s", studentID, req.SessionID)
// 	} else {
// 		log.Printf("Survey not yet completed for student %s (%d/%d questions)",
// 			studentID, answeredQuestionsCount, totalQuestions)
// 	}

// 	if err := tx.Commit(); err != nil {
// 		log.Printf("Error committing transaction: %v", err)
// 		w.WriteHeader(http.StatusInternalServerError)
// 		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save survey"})
// 		return
// 	}


// 	 if answeredQuestionsCount >= totalQuestions {
//         log.Printf("All questions completed, calculating averages for session %s", req.SessionID)
        
//         // Get all question IDs for this session
//         var questionIDs []string
//         rows, err := database.GetDB().Query(`
//             SELECT DISTINCT question_id 
//             FROM survey_results 
//             WHERE session_id = ? AND is_completed = 1`,
//             req.SessionID)
//         if err != nil {
//             log.Printf("Error getting question IDs: %v", err)
//         } else {
//             defer rows.Close()
//             for rows.Next() {
//                 var questionID string
//                 if err := rows.Scan(&questionID); err != nil {
//                     continue
//                 }
//                 questionIDs = append(questionIDs, questionID)
//             }
            
//             // Calculate averages for each question
//             for _, questionID := range questionIDs {
//                 if err := calculateQuestionAverages(req.SessionID, questionID); err != nil {
//                     log.Printf("Error calculating averages for question %s: %v", questionID, err)
//                 }
//             }
            
//             // Now calculate penalties
//             if err := calculatePenalties(req.SessionID); err != nil {
//                 log.Printf("Error calculating penalties: %v", err)
//             }
//         }
//     }


// 	log.Printf("Successfully processed survey submission for student %s in session %s",
// 		studentID, req.SessionID)
// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"status":             "success",
// 		"completed":          answeredQuestionsCount >= totalQuestions,
// 		"questions_answered": answeredQuestionsCount,
// 		"total_questions":    totalQuestions,
// 	})
// }

func UpdateSessionStatus(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SessionID string `json:"sessionId"`
		Status    string `json:"status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
		return
	}

	// Validate status
	validStatuses := map[string]bool{
		"pending":   true,
		"lobby":     true,
		"active":    true,
		"completed": true,
	}
	if !validStatuses[req.Status] {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid status"})
		return
	}

	_, err := database.GetDB().Exec(`
        UPDATE gd_sessions 
        SET status = ?
        WHERE id = ?`,
		req.Status, req.SessionID)

	if err != nil {
		log.Printf("Failed to update session status: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update session status"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}


func calculatePenalties(sessionID string) error {
    tx, err := database.GetDB().Begin()
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %v", err)
    }
    defer tx.Rollback()

    // Debug: Check if we have any records
    var recordCount int
    err = tx.QueryRow(`SELECT COUNT(*) FROM survey_results WHERE session_id = ?`, sessionID).Scan(&recordCount)
    log.Printf("Found %d records for session %s", recordCount, sessionID)

    // Check if penalties already calculated
    var penaltiesCalculated bool
    err = tx.QueryRow(`
        SELECT COUNT(*) > 0 
        FROM survey_results 
        WHERE session_id = ? AND penalty_calculated = TRUE
        LIMIT 1`, sessionID).Scan(&penaltiesCalculated)
    
    if err != nil {
        log.Printf("Error checking penalties: %v", err)
        return fmt.Errorf("error checking penalties: %v", err)
    }
    
    if penaltiesCalculated {
        log.Printf("Penalties already calculated for session %s", sessionID)
        return tx.Commit()
    }

    // Get all ratings with averages
    rows, err := tx.Query(`
        SELECT id, student_id, responder_id, score, average_score, question_id
        FROM survey_results 
        WHERE session_id = ? AND is_completed = 1 
        AND responder_id != student_id
        AND average_score > 0`,
        sessionID)
    if err != nil {
        log.Printf("Error getting ratings: %v", err)
        return fmt.Errorf("error getting ratings: %v", err)
    }
    defer rows.Close()

    var processedCount, penaltyCount int
    for rows.Next() {
        var id, studentID, responderID, questionID string
        var score, averageScore float64
        
        if err := rows.Scan(&id, &studentID, &responderID, &score, &averageScore, &questionID); err != nil {
            log.Printf("Error scanning row: %v", err)
            continue
        }
        
        processedCount++
        
        // Calculate deviation from average
        deviation := math.Abs(score - averageScore)
        log.Printf("Rating: %s -> %s: score=%.2f, avg=%.2f, deviation=%.2f", 
            responderID, studentID, score, averageScore, deviation)
        
        if deviation >= 2.0 {
            penaltyCount++
            log.Printf("APPLYING PENALTY: %s rated %s with deviation %.2f", responderID, studentID, deviation)
            
            // Apply 1-point penalty
            _, err := tx.Exec(`
                UPDATE survey_results 
                SET penalty_points = penalty_points + 1.0,
                    deviation = ?,
                    is_biased = TRUE,
                    penalty_calculated = TRUE
                WHERE id = ?`,
                deviation, id)
            if err != nil {
                log.Printf("Error applying penalty: %v", err)
                return fmt.Errorf("error applying penalty: %v", err)
            }
        } else {
            // Mark as penalty calculated but no penalty
            _, err := tx.Exec(`
                UPDATE survey_results 
                SET penalty_calculated = TRUE,
                    deviation = ?
                WHERE id = ?`,
                deviation, id)
            if err != nil {
                log.Printf("Error updating penalty status: %v", err)
                return fmt.Errorf("error updating penalty status: %v", err)
            }
        }
    }

    log.Printf("Penalty calculation complete: Processed %d ratings, applied %d penalties", processedCount, penaltyCount)
    return tx.Commit()
}


func calculateQuestionAverages(sessionID, questionID string) error {
    tx, err := database.GetDB().Begin()
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %v", err)
    }
    defer tx.Rollback()

    // Get all scores for this question, excluding self-ratings
    type Rating struct {
        StudentID   string
        ResponderID string
        Score       float64
    }
    
    var ratings []Rating
    rows, err := tx.Query(`
        SELECT student_id, responder_id, score 
        FROM survey_results 
        WHERE session_id = ? AND question_id = ? AND responder_id != student_id
        AND is_completed = 1`,
        sessionID, questionID)
    if err != nil {
        return fmt.Errorf("error getting ratings: %v", err)
    }
    defer rows.Close()

    for rows.Next() {
        var r Rating
        if err := rows.Scan(&r.StudentID, &r.ResponderID, &r.Score); err != nil {
            continue
        }
        ratings = append(ratings, r)
    }

    // Calculate average for each student
    studentTotals := make(map[string]float64)
    studentCounts := make(map[string]int)
    
    for _, rating := range ratings {
        studentTotals[rating.StudentID] += rating.Score
        studentCounts[rating.StudentID]++
    }

    // Update average scores in database
    for studentID, total := range studentTotals {
        count := studentCounts[studentID]
        if count > 0 {
            average := total / float64(count)
            
            _, err := tx.Exec(`
                UPDATE survey_results 
                SET average_score = ?
                WHERE session_id = ? AND question_id = ? AND student_id = ?
                AND is_completed = 1`,
                average, sessionID, questionID, studentID)
            if err != nil {
                return fmt.Errorf("error updating average: %v", err)
            }
        }
    }

    return tx.Commit()
}

func GetResults(w http.ResponseWriter, r *http.Request) {
    sessionID := r.URL.Query().Get("session_id")
    studentID := r.Context().Value("studentID").(string)

    // Verify student is part of this session
    var isParticipant bool
    err := database.GetDB().QueryRow(`
        SELECT EXISTS(
            SELECT 1 FROM session_participants 
            WHERE session_id = ? AND student_id = ? AND is_dummy = FALSE
        )`, sessionID, studentID).Scan(&isParticipant)
    
    if err != nil {
        log.Printf("Database error checking participant: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }

    if !isParticipant {
        log.Printf("Student %s not authorized for session %s", studentID, sessionID)
        w.WriteHeader(http.StatusForbidden)
        json.NewEncoder(w).Encode(map[string]string{"error": "Not authorized to view these results"})
        return
    }

 var totalParticipants, completedCount int
    err = database.GetDB().QueryRow(`
        SELECT COUNT(DISTINCT sp.student_id),
               COUNT(DISTINCT sc.student_id)
        FROM session_participants sp
        LEFT JOIN survey_completion sc ON sp.session_id = sc.session_id AND sp.student_id = sc.student_id
        WHERE sp.session_id = ? AND sp.is_dummy = FALSE`,
        sessionID).Scan(&totalParticipants, &completedCount)
    
    if err != nil {
        log.Printf("Error checking survey completion: %v", err)
    }

    // Only calculate penalties if all surveys are completed and penalties not calculated yet
    if completedCount >= totalParticipants && totalParticipants > 0 {
        var penaltiesCalculated bool
        err = database.GetDB().QueryRow(`
            SELECT EXISTS(
                SELECT 1 FROM survey_results 
                WHERE session_id = ? AND penalty_calculated = TRUE
                LIMIT 1
            )`, sessionID).Scan(&penaltiesCalculated)
        
        if err == nil && !penaltiesCalculated {
            log.Printf("Calculating penalties for completed session %s", sessionID)
            if err := calculatePenalties(sessionID); err != nil {
                log.Printf("Warning: Could not calculate penalties: %v", err)
            }
        }
    }

    // Get all participants in this session (including the current student) with photo_url
    participants := make(map[string]struct {
        Name      string
        PhotoURL  string
    })
    
    rows, err := database.GetDB().Query(`
        SELECT su.id, su.full_name, COALESCE(su.photo_url, '') as photo_url
        FROM student_users su
        JOIN session_participants sp ON su.id = sp.student_id
        WHERE sp.session_id = ? AND sp.is_dummy = FALSE`, 
        sessionID)
    
    if err != nil {
        log.Printf("Error getting participants: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }
    defer rows.Close()
    
    for rows.Next() {
        var id, name, photoURL string
        if err := rows.Scan(&id, &name, &photoURL); err != nil {
            continue
        }
        
        // Use default avatar if no photo URL
        if photoURL == "" {
            photoURL = "https://ui-avatars.com/api/?name=" + url.QueryEscape(name) + "&background=random&color=fff"
        }
        
        participants[id] = struct {
            Name      string
            PhotoURL  string
        }{
            Name:     name,
            PhotoURL: photoURL,
        }
    }

    // Create a map to store scores for each student
    studentScores := make(map[string]*struct {
        TotalScore      float64
        FirstPlaces     int
        Penalty         float64
        BiasedQuestions int
    })
    
    // Initialize all participants with zero scores
    for id := range participants {
        studentScores[id] = &struct {
            TotalScore      float64
            FirstPlaces     int
            Penalty         float64
            BiasedQuestions int
        }{}
    }

    // Get scores and penalties for each student
    rows, err = database.GetDB().Query(`
        SELECT student_id, 
               SUM(score) as total_score,
               SUM(penalty_points) as total_penalty,
               COUNT(CASE WHEN is_biased THEN 1 END) as biased_questions
        FROM survey_results 
        WHERE session_id = ? AND is_current_session = 1
        GROUP BY student_id`, sessionID)
    
    if err != nil {
        log.Printf("Error getting survey responses: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }
    defer rows.Close()
    
    for rows.Next() {
        var studentID string
        var totalScore, totalPenalty float64
        var biasedQuestions int
        
        if err := rows.Scan(&studentID, &totalScore, &totalPenalty, &biasedQuestions); err != nil {
            log.Printf("Error scanning survey results: %v", err)
            continue
        }
        
        if studentData, exists := studentScores[studentID]; exists {
            studentData.TotalScore = totalScore
            studentData.Penalty = totalPenalty
            studentData.BiasedQuestions = biasedQuestions
        }
    }

    // Get first place counts separately
    rows, err = database.GetDB().Query(`
        SELECT student_id, COUNT(*) as first_places
        FROM survey_results 
        WHERE session_id = ? AND ranks = 1 AND is_current_session = 1
        GROUP BY student_id`, sessionID)
    
    if err != nil {
        log.Printf("Error getting first places: %v", err)
    } else {
        defer rows.Close()
        for rows.Next() {
            var studentID string
            var firstPlaces int
            if err := rows.Scan(&studentID, &firstPlaces); err != nil {
                continue
            }
            if studentData, exists := studentScores[studentID]; exists {
                studentData.FirstPlaces = firstPlaces
            }
        }
    }

    // Prepare results for sorting
    type StudentResult struct {
        ID              string
        Name            string
        PhotoURL        string
        TotalScore      float64
        Penalty         float64
        FinalScore      float64
        FirstPlaces     int
        BiasedQuestions int
    }
    
    var sortedResults []StudentResult
    for id, data := range studentScores {
        finalScore := data.TotalScore - data.Penalty
        participant := participants[id]
        sortedResults = append(sortedResults, StudentResult{
            ID:              id,
            Name:            participant.Name,
            PhotoURL:        participant.PhotoURL,
            TotalScore:      data.TotalScore,
            Penalty:         data.Penalty,
            FinalScore:      finalScore,
            FirstPlaces:     data.FirstPlaces,
            BiasedQuestions: data.BiasedQuestions,
        })
    }

    // Sort results by final score (descending)
    sort.Slice(sortedResults, func(i, j int) bool {
        if sortedResults[i].FinalScore != sortedResults[j].FinalScore {
            return sortedResults[i].FinalScore > sortedResults[j].FinalScore
        }
        return sortedResults[i].FirstPlaces > sortedResults[j].FirstPlaces
    })

    // Prepare response
    var response []map[string]interface{}
    for _, r := range sortedResults {
        response = append(response, map[string]interface{}{
            "student_id":       r.ID,
            "name":             r.Name,
            "photo_url":        r.PhotoURL,
            "total_score":      fmt.Sprintf("%.2f", r.TotalScore),
            "penalty_points":   fmt.Sprintf("%.2f", r.Penalty),
            "final_score":      fmt.Sprintf("%.2f", r.FinalScore),
            "first_places":     r.FirstPlaces,
            "biased_questions": r.BiasedQuestions,
        })
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "results":    response,
        "session_id": sessionID,
    })
}


func CalculateSessionPenalties(w http.ResponseWriter, r *http.Request) {
    sessionID := r.URL.Query().Get("session_id")
    if sessionID == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "session_id is required"})
        return
    }

    err := calculatePenalties(sessionID)
    if err != nil {
        log.Printf("Error calculating penalties: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to calculate penalties"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "penalties_calculated"})
}

func BookVenue(w http.ResponseWriter, r *http.Request) {
	studentID := r.Context().Value("studentID").(string)

	var req BookingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}
	req.StudentID = studentID

	// Start transaction
	tx, err := database.GetDB().Begin()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	defer tx.Rollback()

	var studentLevel int
	err = tx.QueryRow("SELECT current_gd_level FROM student_users WHERE id = ?", studentID).Scan(&studentLevel)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to verify student level"})
		return
	}

	// Get venue level
	var venueLevel int
	err = tx.QueryRow("SELECT level FROM venues WHERE id = ?", req.VenueID).Scan(&venueLevel)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to verify venue level"})
		return
	}

	// Check if student is trying to book a venue of their level
	if studentLevel != venueLevel {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{
			"error": fmt.Sprintf("You can only book venues for your current level (Level %d)", studentLevel),
		})
		return
	}

	// Check if student already has ANY active booking (not just pending)
	var activeBookingCount int
	err = tx.QueryRow(`
        SELECT COUNT(*) 
        FROM session_participants sp
        JOIN gd_sessions s ON sp.session_id = s.id
        WHERE sp.student_id = ? AND s.status IN ('pending', 'active', 'lobby')`,
		studentID).Scan(&activeBookingCount)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	if activeBookingCount > 0 {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "You already have an active booking. Complete or cancel it before booking another venue",
		})
		return
	}

	// Check if venue exists and get capacity
	var capacity, booked int
	err = tx.QueryRow(`
        SELECT v.capacity, 
               (SELECT COUNT(*) FROM session_participants sp 
                JOIN gd_sessions s ON sp.session_id = s.id 
                WHERE s.venue_id = v.id AND s.status IN ('pending', 'active', 'lobby')) as booked
        FROM venues v 
        WHERE v.id = ? AND v.is_active = TRUE`, req.VenueID).Scan(&capacity, &booked)

	if err != nil {
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Venue not found"})
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		}
		return
	}

	// Check capacity
	if booked >= capacity {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"error": "Venue is full"})
		return
	}

	// Create a new session if needed
	var sessionID string
	err = tx.QueryRow(`
        SELECT id FROM gd_sessions 
        WHERE venue_id = ? AND status IN ('pending', 'lobby')
        ORDER BY start_time ASC LIMIT 1`, req.VenueID).Scan(&sessionID)

	if err == sql.ErrNoRows {
		// Create new session
		sessionID = uuid.New().String()
		_, err = tx.Exec(`
            INSERT INTO gd_sessions 
            (id, venue_id, status, start_time, end_time, level) 
            VALUES (?, ?, 'pending', NOW(), DATE_ADD(NOW(), INTERVAL 1 HOUR), ?)`,
			sessionID, req.VenueID, venueLevel)
		if err != nil {
			log.Printf("Failed to create session: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create session"})
			return
		}
	} else if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	// Check if student is already in this specific session
	var isAlreadyInSession bool
	err = tx.QueryRow(`
        SELECT EXISTS(
            SELECT 1 FROM session_participants 
            WHERE session_id = ? AND student_id = ? AND is_dummy = FALSE
        )`, sessionID, req.StudentID).Scan(&isAlreadyInSession)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	if isAlreadyInSession {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"error": "You have already booked this venue"})
		return
	}

	// Add student to session
	_, err = tx.Exec(`
        INSERT INTO session_participants 
        (id, session_id, student_id, is_dummy) 
        VALUES (UUID(), ?, ?, FALSE)`,
		sessionID, req.StudentID)

	if err != nil {
		log.Printf("Failed to add participant: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Booking failed"})
		return
	}

	// Update student's current booking
	_, err = tx.Exec(`
        UPDATE student_users 
        SET current_booking = ? 
        WHERE id = ?`,
		sessionID, studentID)
	
	if err != nil {
		log.Printf("Failed to update student booking: %v", err)
		// Don't fail the whole booking if this fails
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Booking failed"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":          "booked",
		"session_id":      sessionID,
		"venue_id":        req.VenueID,
		"booked_seats":    booked + 1,
		"remaining_seats": capacity - (booked + 1),
	})
}

func GetAvailableSessions(w http.ResponseWriter, r *http.Request) {
	levelStr := r.URL.Query().Get("level")
	level, err := strconv.Atoi(levelStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid level"})
		return
	}

	rows, err := database.GetDB().Query(`
        SELECT v.id, v.name, v.capacity, v.session_timing, v.table_details, v.level,
               (SELECT COUNT(*) FROM session_participants sp 
                JOIN gd_sessions s ON sp.session_id = s.id 
                WHERE s.venue_id = v.id) as booked
        FROM venues v 
        WHERE v.level = ? AND v.is_active = TRUE`, level)

	if err != nil {
		log.Printf("Database error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	defer rows.Close()

	var venues []map[string]interface{}
	for rows.Next() {
		var venue struct {
			ID            string
			Name          string
			Capacity      int
			SessionTiming string
			TableDetails  string
			Level         int
			Booked        int
		}
		if err := rows.Scan(&venue.ID, &venue.Name, &venue.Capacity,
			&venue.SessionTiming, &venue.TableDetails, &venue.Level, &venue.Booked); err != nil {
			log.Printf("Error scanning venue row: %v", err)
			continue
		}

		venues = append(venues, map[string]interface{}{
			"id":             venue.ID,
			"venue_name":     venue.Name,
			"capacity":       venue.Capacity,
			"booked":         venue.Booked,
			"remaining":      venue.Capacity - venue.Booked,
			"session_timing": venue.SessionTiming,
			"table_details":  venue.TableDetails,
			"level":          venue.Level,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(venues)
}

func CheckBooking(w http.ResponseWriter, r *http.Request) {
	studentID := r.Context().Value("studentID").(string)
	venueID := r.URL.Query().Get("venue_id")

	var isBooked bool
	err := database.GetDB().QueryRow(`
        SELECT EXISTS(
            SELECT 1 FROM session_participants sp
            JOIN gd_sessions s ON sp.session_id = s.id
            WHERE sp.student_id = ? AND s.venue_id = ? AND s.status IN ('pending', 'active', 'lobby')
        )`, studentID, venueID).Scan(&isBooked)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"is_booked": isBooked})
}

func CancelBooking(w http.ResponseWriter, r *http.Request) {
	studentID := r.Context().Value("studentID").(string)

	var req struct {
		VenueID string `json:"venue_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	tx, err := database.GetDB().Begin()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	defer tx.Rollback()

	result, err := tx.Exec(`
        DELETE sp FROM session_participants sp
        JOIN gd_sessions s ON sp.session_id = s.id
        WHERE sp.student_id = ? AND s.venue_id = ? AND s.status IN ('pending', 'lobby')`,
		studentID, req.VenueID)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "No active booking found"})
		return
	}

	// Clear student's current booking
	_, err = tx.Exec(`
        UPDATE student_users 
        SET current_booking = NULL 
        WHERE id = ? AND current_booking IN (
            SELECT id FROM gd_sessions WHERE venue_id = ?
        )`,
		studentID, req.VenueID)
	
	if err != nil {
		log.Printf("Failed to clear student booking: %v", err)
		// Don't fail the cancellation if this fails
	}

	if err := tx.Commit(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "cancelled"})
}

func GetUserBookings(w http.ResponseWriter, r *http.Request) {
	studentID := r.Context().Value("studentID").(string)

	rows, err := database.GetDB().Query(`
        SELECT 
            s.id as session_id,
            v.name as venue_name,
            s.status as session_status,
            s.start_time,
            s.end_time
        FROM session_participants sp
        JOIN gd_sessions s ON sp.session_id = s.id
        JOIN venues v ON s.venue_id = v.id
        WHERE sp.student_id = ? AND s.status IN ('pending', 'active', 'lobby')
        ORDER BY s.start_time DESC`,
		studentID)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}
	defer rows.Close()

	var bookings []map[string]interface{}
	for rows.Next() {
		var booking struct {
			SessionID    string
			VenueName    string
			SessionStatus string
			StartTime    string
			EndTime      string
		}
		if err := rows.Scan(&booking.SessionID, &booking.VenueName, &booking.SessionStatus, &booking.StartTime, &booking.EndTime); err != nil {
			continue
		}
		bookings = append(bookings, map[string]interface{}{
			"session_id": booking.SessionID,
			"venue_name": booking.VenueName,
			"status": booking.SessionStatus,
			"start_time": booking.StartTime,
			"end_time": booking.EndTime,
		})
	}

	if bookings == nil {
		bookings = []map[string]interface{}{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bookings)
}

func GetSessionParticipants(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "session_id is required",
			"data":  []interface{}{},
		})
		return
	}

	studentID := r.Context().Value("studentID").(string)

	// First, clean up any stale phase tracking (users who left unexpectedly)
	_, err := database.GetDB().Exec(`
        DELETE FROM session_phase_tracking 
        WHERE session_id = ? 
        AND start_time < DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
		sessionID)
	if err != nil {
		log.Printf("Error cleaning up stale phase tracking: %v", err)
	}

	// Get current active participants who:
	// 1. Are booked for this session
	// 2. Have scanned QR (have phase tracking)
	// 3. Have active phase tracking within last 5 minutes
	rows, err := database.GetDB().Query(`
        SELECT DISTINCT su.id, su.full_name, su.department, 
               COALESCE(su.photo_url, '') as profileImage 
        FROM session_participants sp
        JOIN student_users su ON sp.student_id = su.id
        JOIN session_phase_tracking spt ON sp.session_id = spt.session_id 
                                      AND sp.student_id = spt.student_id
        WHERE sp.session_id = ? 
          AND sp.is_dummy = FALSE
          AND su.is_active = TRUE
          AND spt.start_time > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        ORDER BY su.full_name`,
		sessionID)

	if err != nil {
		log.Printf("Database error fetching participants: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "Database error",
			"data":  []interface{}{},
		})
		return
	}
	defer rows.Close()

	var participants []map[string]interface{}
	for rows.Next() {
		var participant struct {
			ID           string
			FullName     string
			Department   string
			ProfileImage string // Changed from sql.NullString to string
		}
		if err := rows.Scan(&participant.ID, &participant.FullName, &participant.Department, &participant.ProfileImage); err != nil {
			log.Printf("Error scanning participant: %v", err)
			continue
		}

		// Skip the current student
		if participant.ID == studentID {
			continue
		}

		// Use default image if profile image is not available
		imageURL := participant.ProfileImage
		if imageURL == "" {
			imageURL = "https://ui-avatars.com/api/?name=" + url.QueryEscape(participant.FullName) + "&background=random"
		}

		participants = append(participants, map[string]interface{}{
			"id":           participant.ID,
			"name":         participant.FullName,
			"email":        "",
			"department":   participant.Department,
			"profileImage": imageURL,
		})
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": participants,
	})
}

func CheckSurveyCompletion(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "session_id is required"})
		return
	}

	// Get total participants who have both booked AND scanned QR (have phase tracking)
	var totalParticipants int
	err := database.GetDB().QueryRow(`
        SELECT COUNT(DISTINCT sp.student_id)
        FROM session_participants sp
        JOIN session_phase_tracking spt ON sp.session_id = spt.session_id 
                                      AND sp.student_id = spt.student_id
        WHERE sp.session_id = ? 
          AND sp.is_dummy = FALSE
          AND spt.start_time > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
		sessionID).Scan(&totalParticipants)

	if err != nil {
		log.Printf("Error getting QR-scanned participants: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	// Get count of participants who have completed ALL questions
	var completedCount int
	err = database.GetDB().QueryRow(`
        SELECT COUNT(DISTINCT sc.student_id)
        FROM survey_completion sc
        JOIN session_participants sp ON sc.session_id = sp.session_id AND sc.student_id = sp.student_id
        WHERE sc.session_id = ?`,
		sessionID).Scan(&completedCount)

	if err != nil {
		log.Printf("Error getting completed count: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	log.Printf("Completion check - Session: %s, QR-Scanned: %d, Completed: %d",
		sessionID, totalParticipants, completedCount)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"all_completed": completedCount >= totalParticipants && totalParticipants > 0,
		"completed":     completedCount,
		"total":         totalParticipants,
	})
}

func MarkSurveyCompleted(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SessionID string `json:"session_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
		return
	}

	studentID := r.Context().Value("studentID").(string)

	_, err := database.GetDB().Exec(`
        INSERT INTO survey_completion (session_id, student_id)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE completed_at = NOW()`,
		req.SessionID, studentID)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to mark survey completion"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}
