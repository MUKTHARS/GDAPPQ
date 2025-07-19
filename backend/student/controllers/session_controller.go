package controllers

import (
	"database/sql"
	"encoding/json"
	"gd/database"
	"gd/student/models"
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

	var session struct {
		ID           string
		VenueName    string
		Topic        string
		PrepTime     int
		Discussion   int
		StartTime    time.Time
		Participants []models.Student
	}

	// Get session basics
	err := database.GetDB().QueryRow(`
		SELECT s.id, v.name, s.topic, 
			JSON_EXTRACT(s.agenda, '$.prep_time') as prep_time,
			JSON_EXTRACT(s.agenda, '$.discussion') as discussion,
			s.start_time
		FROM gd_sessions s
		JOIN venues v ON s.venue_id = v.id
		WHERE s.id = ?`, sessionID).Scan(
		&session.ID, &session.VenueName, &session.Topic,
		&session.PrepTime, &session.Discussion, &session.StartTime,
	)

	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	// Get participants
	rows, err := database.GetDB().Query(`
		SELECT su.id, su.full_name, su.department, su.year, su.photo_url
		FROM session_participants sp
		JOIN student_users su ON sp.student_id = su.id
		WHERE sp.session_id = ? AND sp.is_dummy = FALSE`, sessionID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var student models.Student
		if err := rows.Scan(&student.ID, &student.Name, &student.Department, &student.Year, &student.PhotoURL); err == nil {
			session.Participants = append(session.Participants, student)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}

// SubmitSurvey handles survey responses
// func SubmitSurvey(w http.ResponseWriter, r *http.Request) {
// 	var request struct {
// 		SessionID string                     `json:"session_id"`
// 		StudentID string                     `json:"student_id"`
// 		Responses map[int]map[int]string `json:"responses"` // question_number -> rank -> student_id
// 	}

// 	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
// 		w.WriteHeader(http.StatusBadRequest)
// 		return
// 	}

// 	tx, err := database.GetDB().Begin()
// 	if err != nil {
// 		w.WriteHeader(http.StatusInternalServerError)
// 		return
// 	}

// 	// Delete existing responses if any
// 	_, err = tx.Exec("DELETE FROM survey_responses WHERE responder_id = ? AND session_id = ?", 
// 		request.StudentID, request.SessionID)
// 	if err != nil {
// 		tx.Rollback()
// 		w.WriteHeader(http.StatusInternalServerError)
// 		return
// 	}

// 	// Insert new responses
// 	for qNum, rankings := range request.Responses {
// 		for rank, studentID := range rankings {
// 			_, err := tx.Exec(`
// 				INSERT INTO survey_responses 
// 				(id, session_id, responder_id, question_number, 
// 				first_place, second_place, third_place)
// 				VALUES (UUID(), ?, ?, ?, 
// 					IF(?=1,?,NULL), 
// 					IF(?=2,?,NULL), 
// 					IF(?=3,?,NULL))`,
// 				request.SessionID, request.StudentID, qNum,
// 				rank, studentID,
// 				rank, studentID,
// 				rank, studentID,
// 			)
// 			if err != nil {
// 				tx.Rollback()
// 				w.WriteHeader(http.StatusInternalServerError)
// 				return
// 			}
// 		}
// 	}

// 	if err := tx.Commit(); err != nil {
// 		w.WriteHeader(http.StatusInternalServerError)
// 		return
// 	}

// 	w.WriteHeader(http.StatusOK)
// 	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
// }

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
	studentID := r.URL.Query().Get("student_id")

	var result struct {
		Qualified    bool    `json:"qualified"`
		NextLevel    int     `json:"next_level"`
		Scores       struct {
			Leadership   float64 `json:"leadership"`
			Communication float64 `json:"communication"`
			Teamwork     float64 `json:"teamwork"`
		} `json:"scores"`
		Feedback     string `json:"feedback"`
	}

	err := database.GetDB().QueryRow(`
		SELECT 
			q.qualified_for_level > s.current_gd_level as qualified,
			q.qualified_for_level as next_level,
			JSON_EXTRACT(q.final_score, '$.leadership') as leadership,
			JSON_EXTRACT(q.final_score, '$.communication') as communication,
			JSON_EXTRACT(q.final_score, '$.teamwork') as teamwork,
			q.feedback
		FROM qualifications q
		JOIN student_users s ON q.student_id = s.id
		WHERE q.session_id = ? AND q.student_id = ?`,
		sessionID, studentID).Scan(
		&result.Qualified, &result.NextLevel,
		&result.Scores.Leadership, &result.Scores.Communication, 
		&result.Scores.Teamwork, &result.Feedback,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusNotFound)
		} else {
			w.WriteHeader(http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}