// Create a new file survey_controller.go in student/controllers
package controllers

import (
	// "database/sql"
	"database/sql"
	"encoding/json"
	// "fmt"
	"gd/database"
	// "log"
	"net/http"
	"time"
)

func StartSurveyTimer(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "session_id is required"})
		return
	}

	// Set timer for 30 seconds per question * number of questions
	_, err := database.GetDB().Exec(`
		UPDATE gd_sessions 
		SET survey_end_time = DATE_ADD(NOW(), INTERVAL 30 SECOND)
		WHERE id = ?`, sessionID)
	
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to start timer"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "timer_started"})
}

func CheckSurveyTimeout(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session_id")
	// studentID := r.Context().Value("studentID").(string)

	var surveyEndTime time.Time
	err := database.GetDB().QueryRow(`
		SELECT survey_end_time FROM gd_sessions WHERE id = ?`, sessionID).Scan(&surveyEndTime)
	
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	remaining := time.Until(surveyEndTime).Seconds()
	if remaining < 0 {
		remaining = 0
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"remaining_seconds": remaining,
		"is_timed_out":      remaining <= 0,
	})
}

func ApplySurveyPenalties(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "session_id is required"})
		return
	}

	tx, err := database.GetDB().Begin()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	defer tx.Rollback()

	// Calculate average scores per question
	_, err = tx.Exec(`
		UPDATE survey_results sr
		JOIN (
			SELECT 
				question_number,
				AVG(score) as avg_score
			FROM survey_results
			WHERE session_id = ?
			GROUP BY question_number
		) as averages ON sr.question_number = averages.question_number
		SET sr.penalty_points = CASE
			WHEN sr.score < (averages.avg_score - 2) THEN 1
			ELSE 0
		END
		WHERE sr.session_id = ?`, sessionID, sessionID)
	
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to calculate penalties"})
		return
	}

	// Detect biased responses
	_, err = tx.Exec(`
		UPDATE survey_results sr
		SET sr.is_biased = TRUE
		WHERE sr.session_id = ? AND sr.responder_id IN (
			SELECT responder_id FROM (
				SELECT 
					responder_id,
					COUNT(DISTINCT student_id) as unique_rankings
				FROM survey_results
				WHERE session_id = ?
				GROUP BY responder_id
				HAVING unique_rankings < 3
			) as potential_bias
		)`, sessionID, sessionID)
	
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to detect bias"})
		return
	}

	if err := tx.Commit(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to apply penalties"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "penalties_applied"})
}

func StartQuestionTimer(w http.ResponseWriter, r *http.Request) {
    var req struct {
        SessionID  string `json:"session_id"`
        QuestionID int    `json:"question_id"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
        return
    }

    // Always set exactly 30 seconds for each question
    _, err := database.GetDB().Exec(`
        INSERT INTO question_timers (session_id, question_id, end_time)
        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 SECOND))
        ON DUPLICATE KEY UPDATE end_time = DATE_ADD(NOW(), INTERVAL 30 SECOND)`,
        req.SessionID, req.QuestionID)
    
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to start timer"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "timer_started"})
}

func CheckQuestionTimeout(w http.ResponseWriter, r *http.Request) {
    sessionID := r.URL.Query().Get("session_id")
    questionID := r.URL.Query().Get("question_id")

    // Default response if any error occurs
    defaultResponse := map[string]interface{}{
        "remaining_seconds": 30,
        "is_timed_out":      false,
    }

    var endTime time.Time
    err := database.GetDB().QueryRow(`
        SELECT end_time FROM question_timers
        WHERE session_id = ? AND question_id = ?`, sessionID, questionID).Scan(&endTime)
    
    if err != nil {
        if err == sql.ErrNoRows {
            // No timer found, return default values
            w.Header().Set("Content-Type", "application/json")
            json.NewEncoder(w).Encode(defaultResponse)
            return
        }
        // For other errors, still return default values
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(defaultResponse)
        return
    }

    remaining := time.Until(endTime).Seconds()
    if remaining < 0 {
        remaining = 0
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "remaining_seconds": remaining,
        "is_timed_out":      remaining <= 0,
    })
}

func ApplyQuestionPenalty(w http.ResponseWriter, r *http.Request) {
    var req struct {
        SessionID  string `json:"session_id"`
        QuestionID int    `json:"question_id"`
        StudentID  string `json:"student_id"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
        return
    }

    // Apply penalty for this specific question
    _, err := database.GetDB().Exec(`
        INSERT INTO survey_penalties (session_id, question_id, student_id, penalty_points)
        VALUES (?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE penalty_points = penalty_points + 1`,
        req.SessionID, req.QuestionID, req.StudentID)
    
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to apply penalty"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "penalty_applied"})
}


func HandleSurveyTimeout(sessionID string, studentID string, questionID int) error {
    tx, err := database.GetDB().Begin()
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // Apply penalty for timeout
    _, err = tx.Exec(`
        INSERT INTO survey_penalties 
        (session_id, question_id, student_id, penalty_points, reason)
        VALUES (?, ?, ?, 1, 'timeout')
        ON DUPLICATE KEY UPDATE 
        penalty_points = penalty_points + 1,
        updated_at = NOW()`,
        sessionID, questionID, studentID)
    
    if err != nil {
        return err
    }

    // Record the timeout event
    _, err = tx.Exec(`
        INSERT INTO survey_timeouts
        (session_id, student_id, question_id)
        VALUES (?, ?, ?)`,
        sessionID, studentID, questionID)
    
    if err != nil {
        return err
    }

    return tx.Commit()
}


type Participant struct {
    ID string
}

// getSessionParticipants retrieves all participant IDs for a given session.
func getSessionParticipants(sessionID string) ([]Participant, error) {
    rows, err := database.GetDB().Query(`
        SELECT DISTINCT responder_id 
        FROM survey_results 
        WHERE session_id = ?`, sessionID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var participants []Participant
    for rows.Next() {
        var id string
        if err := rows.Scan(&id); err != nil {
            return nil, err
        }
        participants = append(participants, Participant{ID: id})
    }
    return participants, nil
}

func CalculateFinalResults(sessionID string) (map[string]float64, error) {
    results := make(map[string]float64)
    
    // Get all participants
    participants, err := getSessionParticipants(sessionID)
    if err != nil {
        return nil, err
    }
    
    // Calculate raw scores
    for _, p := range participants {
        var totalScore float64
        err := database.GetDB().QueryRow(`
            SELECT COALESCE(SUM(score), 0) 
            FROM survey_results 
            WHERE responder_id = ? AND session_id = ?`,
            p.ID, sessionID).Scan(&totalScore)
        if err != nil {
            return nil, err
        }
        results[p.ID] = totalScore
    }
    
    // Apply penalties
    penaltyRows, err := database.GetDB().Query(`
        SELECT student_id, SUM(penalty_points) 
        FROM survey_penalties 
        WHERE session_id = ?
        GROUP BY student_id`, sessionID)
    if err != nil {
        return nil, err
    }
    defer penaltyRows.Close()
    
    for penaltyRows.Next() {
        var studentID string
        var penaltyPoints int
        if err := penaltyRows.Scan(&studentID, &penaltyPoints); err != nil {
            return nil, err
        }
        if score, exists := results[studentID]; exists {
            results[studentID] = score - float64(penaltyPoints)
        }
    }
    
    return results, nil
}