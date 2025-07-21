package controllers

import (
	"database/sql"
	"encoding/json"
	"gd/database"
	"gd/student/models"
	"log"
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


type SurveyResponse struct {
	Question int               `json:"question"`
	Rankings map[int]string    `json:"rankings"` 
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


func GetAvailableSessions(w http.ResponseWriter, r *http.Request) {
    levelStr := r.URL.Query().Get("level")
    level, err := strconv.Atoi(levelStr)
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid level"})
        return
    }

    // Query to get active venues for the requested level with capacity
    rows, err := database.GetDB().Query(`
        SELECT id, name, capacity, session_timing, table_details
        FROM venues 
        WHERE level = ? AND is_active = TRUE`,
        level,
    )
    
    if err != nil {
        log.Printf("Database error: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{
            "error": "Database error",
            "details": err.Error(),
        })
        return
    }
    defer rows.Close()

    var venues []map[string]interface{}
    for rows.Next() {
        var venue struct {
            ID           string
            Name         string
            Capacity     int
            SessionTiming string
            TableDetails  string
        }
        if err := rows.Scan(&venue.ID, &venue.Name, &venue.Capacity, &venue.SessionTiming, &venue.TableDetails); err != nil {
            log.Printf("Error scanning venue row: %v", err)
            continue
        }

        venues = append(venues, map[string]interface{}{
            "id":            venue.ID,
            "venue_name":    venue.Name,
            "capacity":      venue.Capacity,
            "session_timing": venue.SessionTiming,
            "table_details":  venue.TableDetails,
        })
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(venues)
}
