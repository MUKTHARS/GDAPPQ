package controllers

import (
	"database/sql"
	"encoding/json"
	"gd/database"
	"net/http"
	"strconv"
	"time"
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
func GetSessionDetails(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	var session SessionDetails
	err := database.GetDB().QueryRow(`
		SELECT s.id, v.name, s.agenda->>"$.topic", 
		       s.agenda->>"$.prep_time", s.agenda->>"$.discussion",
		       s.start_time
		FROM gd_sessions s
		JOIN venues v ON s.venue_id = v.id
		WHERE s.id = ?`, sessionID).Scan(
		&session.ID, &session.Venue, &session.Topic,
		&session.PrepTime, &session.Discussion, &session.StartTime,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusNotFound)
		} else {
			w.WriteHeader(http.StatusInternalServerError)
		}
		return
	}

	// Get participants
	rows, err := database.GetDB().Query(`
		SELECT s.id, s.full_name 
		FROM session_participants p
		JOIN student_users s ON p.student_id = s.id
		WHERE p.session_id = ?`, sessionID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			continue
		}
		session.Participants = append(session.Participants, name)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}

type SurveyResponse struct {
	Question int               `json:"question"`
	Rankings map[int]string    `json:"rankings"` // rank -> student_id
}

func GetAvailableSessions(w http.ResponseWriter, r *http.Request) {
	levelStr := r.URL.Query().Get("level")
	level, err := strconv.Atoi(levelStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid level"})
		return
	}

	// Actual database implementation would go here
	rows, err := database.GetDB().Query(
		`SELECT id, venue_id, start_time 
		FROM gd_sessions 
		WHERE level = ? AND status = 'pending' 
		AND start_time > NOW()`,
		level,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var sessions []map[string]interface{}
	for rows.Next() {
		var session struct {
			ID        string
			VenueID   string
			StartTime time.Time
		}
		if err := rows.Scan(&session.ID, &session.VenueID, &session.StartTime); err != nil {
			continue
		}

		sessions = append(sessions, map[string]interface{}{
			"id":         session.ID,
			"venue_id":   session.VenueID,
			"start_time": session.StartTime,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sessions)
}

func JoinSession(w http.ResponseWriter, r *http.Request) {
	var request struct {
		QRData string `json:"qr_data"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// Validate QR and join session
	// This would be implemented with your QR validation logic
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status": "joined",
		"session_id": "session123", // Example response
	})
}

func SubmitSurvey(w http.ResponseWriter, r *http.Request) {
	studentID := r.Context().Value("studentID").(string)
	
	var req struct {
		SessionID string                   `json:"session_id"`
		Responses map[int]map[int]string   `json:"responses"` // question -> rank -> student_id
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	tx, err := database.GetDB().Begin()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	for q, rankings := range req.Responses {
		_, err := tx.Exec(`
			INSERT INTO survey_responses 
			(id, session_id, responder_id, question_number, 
			 first_place, second_place, third_place)
			VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
			req.SessionID, studentID, q,
			rankings[1], rankings[2], rankings[3],
		)
		if err != nil {
			tx.Rollback()
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func GetResults(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session_id")
	studentID := r.Context().Value("studentID").(string)

	var result struct {
		Scores struct {
			Leadership    float64 `json:"leadership"`
			Communication float64 `json:"communication"`
			Teamwork      float64 `json:"teamwork"`
		} `json:"scores"`
		Qualified    bool   `json:"qualified"`
		NextLevel    int    `json:"next_level"`
		Feedback     string `json:"feedback"`
	}

	err := database.GetDB().QueryRow(`
		SELECT final_score, qualified_for_level, 
		       (qualified_for_level > current_gd_level) as qualified
		FROM qualifications q
		JOIN student_users s ON q.student_id = s.id
		WHERE q.session_id = ? AND q.student_id = ?`,
		sessionID, studentID,
	).Scan(&result.Scores, &result.NextLevel, &result.Qualified)

	if err != nil {
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusNotFound)
		} else {
			w.WriteHeader(http.StatusInternalServerError)
		}
		return
	}

	// Normalize scores to 0-5 scale
	result.Scores.Leadership = result.Scores.Leadership / 20 * 5
	result.Scores.Communication = result.Scores.Communication / 20 * 5
	result.Scores.Teamwork = result.Scores.Teamwork / 20 * 5

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}