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

type BookingRequest struct {
    VenueID    string `json:"venue_id"`
    StudentID  string `json:"student_id"`
}

// Add this new function
func BookVenue(w http.ResponseWriter, r *http.Request) {
    studentID := r.Context().Value("studentID").(string)
    
    var req BookingRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
        return
    }
    req.StudentID = studentID

    // Check if venue exists and get capacity
    var capacity, booked int
    err := database.GetDB().QueryRow(`
        SELECT v.capacity, 
               (SELECT COUNT(*) FROM session_participants sp 
                JOIN gd_sessions s ON sp.session_id = s.id 
                WHERE s.venue_id = v.id) as booked
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

    // Create a new session if needed or add to existing one
    var sessionID string
    err = database.GetDB().QueryRow(`
        SELECT id FROM gd_sessions 
        WHERE venue_id = ? AND status = 'pending' 
        ORDER BY start_time ASC LIMIT 1`, req.VenueID).Scan(&sessionID)

    if err == sql.ErrNoRows {
        // Create new session
        sessionID = uuid.New().String()
        _, err = database.GetDB().Exec(`
            INSERT INTO gd_sessions 
            (id, venue_id, status, start_time, end_time) 
            VALUES (?, ?, 'pending', NOW(), DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
            sessionID, req.VenueID)
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create session"})
            return
        }
    } else if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }

    // Add student to session
    _, err = database.GetDB().Exec(`
        INSERT INTO session_participants 
        (id, session_id, student_id, is_dummy) 
        VALUES (UUID(), ?, ?, FALSE)`,
        sessionID, req.StudentID)
    
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Booking failed"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "status": "booked",
        "session_id": sessionID,
        "venue_id": req.VenueID,
        "booked_seats": booked + 1,
        "remaining_seats": capacity - (booked + 1),
    })
}

// Update GetAvailableSessions to include booking info
func GetAvailableSessions(w http.ResponseWriter, r *http.Request) {
    levelStr := r.URL.Query().Get("level")
    level, err := strconv.Atoi(levelStr)
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid level"})
        return
    }

    rows, err := database.GetDB().Query(`
        SELECT v.id, v.name, v.capacity, v.session_timing, v.table_details,
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
            ID           string
            Name         string
            Capacity     int
            SessionTiming string
            TableDetails  string
            Booked       int
        }
        if err := rows.Scan(&venue.ID, &venue.Name, &venue.Capacity, 
                          &venue.SessionTiming, &venue.TableDetails, &venue.Booked); err != nil {
            log.Printf("Error scanning venue row: %v", err)
            continue
        }

        venues = append(venues, map[string]interface{}{
            "id":            venue.ID,
            "venue_name":    venue.Name,
            "capacity":     venue.Capacity,
            "booked":       venue.Booked,
            "remaining":    venue.Capacity - venue.Booked,
            "session_timing": venue.SessionTiming,
            "table_details":  venue.TableDetails,
        })
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(venues)
}


// func GetAvailableSessions(w http.ResponseWriter, r *http.Request) {
//     levelStr := r.URL.Query().Get("level")
//     level, err := strconv.Atoi(levelStr)
//     if err != nil {
//         w.WriteHeader(http.StatusBadRequest)
//         json.NewEncoder(w).Encode(map[string]string{"error": "Invalid level"})
//         return
//     }

//     // Query to get active venues for the requested level with capacity
//     rows, err := database.GetDB().Query(`
//         SELECT id, name, capacity, session_timing, table_details
//         FROM venues 
//         WHERE level = ? AND is_active = TRUE`,
//         level,
//     )
    
//     if err != nil {
//         log.Printf("Database error: %v", err)
//         w.WriteHeader(http.StatusInternalServerError)
//         json.NewEncoder(w).Encode(map[string]string{
//             "error": "Database error",
//             "details": err.Error(),
//         })
//         return
//     }
//     defer rows.Close()

//     var venues []map[string]interface{}
//     for rows.Next() {
//         var venue struct {
//             ID           string
//             Name         string
//             Capacity     int
//             SessionTiming string
//             TableDetails  string
//         }
//         if err := rows.Scan(&venue.ID, &venue.Name, &venue.Capacity, &venue.SessionTiming, &venue.TableDetails); err != nil {
//             log.Printf("Error scanning venue row: %v", err)
//             continue
//         }

//         venues = append(venues, map[string]interface{}{
//             "id":            venue.ID,
//             "venue_name":    venue.Name,
//             "capacity":      venue.Capacity,
//             "session_timing": venue.SessionTiming,
//             "table_details":  venue.TableDetails,
//         })
//     }

//     w.Header().Set("Content-Type", "application/json")
//     json.NewEncoder(w).Encode(venues)
// }
