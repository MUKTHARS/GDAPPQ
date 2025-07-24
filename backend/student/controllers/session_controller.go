package controllers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"gd/database"
	"gd/student/models"
	"log"
	"net/http"
	"strconv"
	"strings"
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
    VenueID    string `json:"venue_id"`
    StudentID  string `json:"student_id"`
}

type SurveyResponse struct {
	Question int               `json:"question"`
	Rankings map[int]string    `json:"rankings"` 
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

func JoinSession(w http.ResponseWriter, r *http.Request) {
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
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "QR data is required"})
        return
    }

    log.Printf("JoinSession request for QR: %s", request.QRData)
    studentID := r.Context().Value("studentID").(string)
    
    // Verify QR code
    var (
        venueID    string
        expiryTime time.Time
    )
    
    // First try scanning directly into time.Time
    err := database.GetDB().QueryRow(`
        SELECT venue_id, expires_at 
        FROM venue_qr_codes 
        WHERE qr_data = ? 
        AND is_active = TRUE 
        AND expires_at > NOW()`,
        request.QRData,
    ).Scan(&venueID, &expiryTime)

    // If that fails with scan error, try scanning as string and parsing
    if err != nil && strings.Contains(err.Error(), "unsupported Scan") {
        var expiryStr string
        err = database.GetDB().QueryRow(`
            SELECT venue_id, expires_at 
            FROM venue_qr_codes 
            WHERE qr_data = ? 
            AND is_active = TRUE 
            AND expires_at > NOW()`,
            request.QRData,
        ).Scan(&venueID, &expiryStr)
        
        if err == nil {
            expiryTime, err = time.Parse("2006-01-02 15:04:05", expiryStr)
            if err != nil {
                log.Printf("Error parsing expiry time: %v", err)
                w.WriteHeader(http.StatusInternalServerError)
                json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
                return
            }
        }
    }

    if err != nil {
        if err == sql.ErrNoRows {
            w.WriteHeader(http.StatusUnauthorized)
            json.NewEncoder(w).Encode(map[string]string{"error": "Invalid or expired QR code"})
        } else {
            log.Printf("Database error in QR validation: %v", err)
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        }
        return
    }

    // Check if student has booked this venue
    var sessionID string
    err = database.GetDB().QueryRow(`
        SELECT s.id 
        FROM gd_sessions s
        JOIN session_participants sp ON s.id = sp.session_id
        WHERE s.venue_id = ? 
        AND sp.student_id = ? 
        AND s.status IN ('pending', 'active')
        AND sp.is_dummy = FALSE`,
        venueID, studentID,
    ).Scan(&sessionID)
    
    if err != nil {
        if err == sql.ErrNoRows {
            w.WriteHeader(http.StatusForbidden)
            json.NewEncoder(w).Encode(map[string]string{"error": "You haven't booked this venue"})
        } else {
            log.Printf("Database error in booking check: %v", err)
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        }
        return
    }

    // Update session status to active if not already
    _, err = database.GetDB().Exec(`
        UPDATE gd_sessions 
        SET status = 'active' 
        WHERE id = ? AND status = 'pending'`,
        sessionID,
    )
    if err != nil {
        log.Printf("Failed to activate session: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to activate session"})
        return
    }

    log.Printf("Successfully joined session %s for student %s", sessionID, studentID)
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{
        "status":     "joined",
        "session_id": sessionID,
    })
}

// func JoinSession(w http.ResponseWriter, r *http.Request) {
//     var request struct {
//         QRData string `json:"qr_data"`
//     }
    
//      if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
//         log.Printf("JoinSession decode error: %v", err)
//         w.WriteHeader(http.StatusBadRequest)
//         json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
//         return
//     }
//        if request.QRData == "" {
//         w.WriteHeader(http.StatusBadRequest)
//         json.NewEncoder(w).Encode(map[string]string{"error": "QR data is required"})
//         return
//     }

//     log.Printf("JoinSession request for QR: %s", request.QRData)
//     studentID := r.Context().Value("studentID").(string)
    
//     // Verify QR code
//     var (
//         venueID    string
//         expiryTime time.Time
//     )
//     err := database.GetDB().QueryRow(`
//     SELECT venue_id, expires_at 
//     FROM venue_qr_codes 
//     WHERE qr_data = ? 
//     AND is_active = TRUE 
//     AND expires_at > NOW()`,
//     request.QRData,
// ).Scan(&venueID, &expiryTime)
//     // log.Printf("Validating QR - DB Server NOW(): %v", time.Now())
//     // log.Printf("Validating QR - QR expires_at: %v", expiryTime)
//     if err != nil {
//         if err == sql.ErrNoRows {
//             w.WriteHeader(http.StatusUnauthorized)
//             json.NewEncoder(w).Encode(map[string]string{"error": "Invalid or expired QR code"})
//         } else {
//              log.Printf("Database error in QR validation: %v", err)
//             w.WriteHeader(http.StatusInternalServerError)
//             json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
//         }
//         return
//     }

//     // Check if student has booked this venue
//     var sessionID string
//     err = database.GetDB().QueryRow(`
//         SELECT s.id 
//         FROM gd_sessions s
//         JOIN session_participants sp ON s.id = sp.session_id
//         WHERE s.venue_id = ? 
//         AND sp.student_id = ? 
//         AND s.status IN ('pending', 'active')
//         AND sp.is_dummy = FALSE`,
//         venueID, studentID,
//     ).Scan(&sessionID)
    
//     if err != nil {
//         if err == sql.ErrNoRows {
//             w.WriteHeader(http.StatusForbidden)
//             json.NewEncoder(w).Encode(map[string]string{"error": "You haven't booked this venue"})
//         } else {
//             log.Printf("Database error in booking check: %v", err)
//             w.WriteHeader(http.StatusInternalServerError)
//             json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
//         }
//         return
//     }

//     // Update session status to active if not already
//     _, err = database.GetDB().Exec(`
//         UPDATE gd_sessions 
//         SET status = 'active' 
//         WHERE id = ? AND status = 'pending'`,
//         sessionID,
//     )
//     if err != nil {
//         log.Printf("Failed to activate session: %v", err)
//         w.WriteHeader(http.StatusInternalServerError)
//         json.NewEncoder(w).Encode(map[string]string{"error": "Failed to activate session"})
//         return
//     }
// log.Printf("Successfully joined session %s for student %s", sessionID, studentID)
//     w.WriteHeader(http.StatusOK)
//     json.NewEncoder(w).Encode(map[string]string{
//         "status":     "joined",
//         "session_id": sessionID,
//     })
// }

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




	 var activeBookingCount int
    err = tx.QueryRow(`
        SELECT COUNT(*) 
        FROM session_participants sp
        JOIN gd_sessions s ON sp.session_id = s.id
        WHERE sp.student_id = ? AND s.status = 'pending'`, 
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

    // Create a new session if needed
    var sessionID string
    err = tx.QueryRow(`
        SELECT id FROM gd_sessions 
        WHERE venue_id = ? AND status = 'pending' 
        ORDER BY start_time ASC LIMIT 1`, req.VenueID).Scan(&sessionID)

    if err == sql.ErrNoRows {
        // Create new session
        sessionID = uuid.New().String()
        _, err = tx.Exec(`
            INSERT INTO gd_sessions 
            (id, venue_id, status, start_time, end_time, level) 
            VALUES (?, ?, 'pending', NOW(), DATE_ADD(NOW(), INTERVAL 1 HOUR), 
                   (SELECT level FROM venues WHERE id = ?))`,
            sessionID, req.VenueID, req.VenueID)
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

    // Add student to session
    _, err = tx.Exec(`
        INSERT INTO session_participants 
        (id, session_id, student_id, is_dummy) 
        VALUES (UUID(), ?, ?, FALSE)`,
        sessionID, req.StudentID)
    
   if err != nil {
    if strings.Contains(err.Error(), "Duplicate entry") {
        w.WriteHeader(http.StatusConflict)
        json.NewEncoder(w).Encode(map[string]string{"error": "You have already booked this venue"})
        return
    }
    log.Printf("Failed to add participant: %v", err)
    w.WriteHeader(http.StatusInternalServerError)
    json.NewEncoder(w).Encode(map[string]string{"error": "Booking failed"})
    return
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
        "status": "booked",
        "session_id": sessionID,
        "venue_id": req.VenueID,
        "booked_seats": booked + 1,
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
            ID           string
            Name         string
            Capacity     int
            SessionTiming string
            TableDetails  string
			Level        int
            Booked       int
        }
        if err := rows.Scan(&venue.ID, &venue.Name, &venue.Capacity, 
                          &venue.SessionTiming, &venue.TableDetails,&venue.Level, &venue.Booked); err != nil {
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
			"level":        venue.Level,
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
            WHERE sp.student_id = ? AND s.venue_id = ? AND s.status = 'pending'
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

    result, err := database.GetDB().Exec(`
        DELETE sp FROM session_participants sp
        JOIN gd_sessions s ON sp.session_id = s.id
        WHERE sp.student_id = ? AND s.venue_id = ? AND s.status = 'pending'`,
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

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "cancelled"})
}