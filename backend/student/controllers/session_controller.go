package controllers

import (
	// "bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"gd/database"
	"sort"

	// "io"

	// "sort"

	// "gd/student/models"
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
        id         string
        venue      string
        topic      sql.NullString
        agendaJSON []byte
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
            if agenda.Discussion > 60 { // If somehow seconds got stored
                agenda.Discussion = agenda.Discussion / 60
            }
        }
    }

    response := map[string]interface{}{
        "id":            id,
        "venue":         venue,
        "topic":        topic.String,
        "prep_time":    agenda.PrepTime,
        "discussion_time": agenda.Discussion,
        "survey_time":   agenda.Survey,
        "start_time":   startTime,
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

    // Verify QR code against database
    var dbQRData string
    
    err := database.GetDB().QueryRow(`
        SELECT qr_data 
        FROM venue_qr_codes 
        WHERE venue_id = ? 
        AND is_active = TRUE 
        AND expires_at > NOW()`,
        qrPayload.VenueID,
    ).Scan(&dbQRData)

    if err != nil {
        if err == sql.ErrNoRows {
            log.Printf("No active QR code found for venue %s", qrPayload.VenueID)
            w.WriteHeader(http.StatusUnauthorized)
            json.NewEncoder(w).Encode(map[string]string{"error": "Invalid or expired QR code"})
        } else {
            log.Printf("Database error in QR validation: %v", err)
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        }
        return
    }

    // Check if QR data matches
    if dbQRData != request.QRData {
        log.Printf("QR code mismatch - stored: %s, received: %s", dbQRData, request.QRData)
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "QR code verification failed"})
        return
    }

    // Find or create session for this venue
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

    // First check if there's an active session for this venue
    err = tx.QueryRow(`
        SELECT id FROM gd_sessions 
        WHERE venue_id = ? AND status IN ('pending', 'active')
        ORDER BY created_at DESC LIMIT 1`,
        qrPayload.VenueID).Scan(&sessionID)

    if err != nil && err != sql.ErrNoRows {
        log.Printf("Database error finding venue session: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }

    // If no session exists, create one
   if err == sql.ErrNoRows {
    sessionID = uuid.New().String()
    _, err = tx.Exec(`
        INSERT INTO gd_sessions 
        (id, venue_id, status, start_time, end_time, level) 
        VALUES (?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 HOUR), 
               (SELECT level FROM venues WHERE id = ?))`,
        sessionID, qrPayload.VenueID, qrPayload.VenueID)
    if err != nil {
        log.Printf("Failed to create session: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create session"})
        return
    }
    log.Printf("Created new session %s for venue %s", sessionID, qrPayload.VenueID)
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

func SubmitSurvey(w http.ResponseWriter, r *http.Request) {
    studentID := r.Context().Value("studentID").(string)
    log.Printf("SubmitSurvey started for student %s", studentID)
    
    var req struct {
        SessionID string                   `json:"session_id"`
        Responses map[int]map[int]string   `json:"responses"` // question -> rank -> studentID
    }
    
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        log.Printf("Survey decode error: %v", err)
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
        return
    }

    // Validate session ID format
    if _, err := uuid.Parse(req.SessionID); err != nil {
        log.Printf("Invalid session ID format: %v", err)
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid session ID"})
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

    // Verify session exists and is active
    var sessionExists bool
    err = tx.QueryRow(`
        SELECT EXISTS(
            SELECT 1 FROM gd_sessions 
            WHERE id = ? AND status IN ('active', 'pending')
        )`, req.SessionID).Scan(&sessionExists)
    if err != nil {
        log.Printf("Error checking session existence: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }
    if !sessionExists {
        log.Printf("Session %s does not exist or is not active", req.SessionID)
        w.WriteHeader(http.StatusNotFound)
        json.NewEncoder(w).Encode(map[string]string{"error": "Session not found or not active"})
        return
    }

    // Verify student is a participant
    var isParticipant bool
    err = tx.QueryRow(`
        SELECT EXISTS(
            SELECT 1 FROM session_participants 
            WHERE session_id = ? AND student_id = ? AND is_dummy = FALSE
        )`, req.SessionID, studentID).Scan(&isParticipant)
    if err != nil {
        log.Printf("Error checking participant status: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }
    if !isParticipant {
        log.Printf("Student %s not part of session %s", studentID, req.SessionID)
        w.WriteHeader(http.StatusForbidden)
        json.NewEncoder(w).Encode(map[string]string{"error": "Not authorized to submit survey"})
        return
    }

    // Clear previous responses if any
    _, err = tx.Exec(`
        DELETE FROM survey_results 
        WHERE session_id = ? AND student_id = ?`,
        req.SessionID, studentID)
    if err != nil {
        log.Printf("Error clearing previous responses: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }

    // Process each question response
    for q, rankings := range req.Responses {
        // For testing with single rank, we'll accept 1 ranking
        // In production, you should require exactly 3 rankings:
        // if len(rankings) != 3 {
        //    w.WriteHeader(http.StatusBadRequest)
        //    json.NewEncoder(w).Encode(map[string]string{"error": "Exactly 3 rankings required per question"})
        //    return
        // }
        
        for rank, responderID := range rankings {
            score := 4 - rank // 1st=3, 2nd=2, 3rd=1
            
            _, err = tx.Exec(`
                INSERT INTO survey_results 
                (id, session_id, student_id, responder_id, question_number, ranks, score)
                VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
                req.SessionID, 
                studentID,
                responderID,
                q,
                rank,
                score,
            )
            if err != nil {
                tx.Rollback()
                log.Printf("Error saving survey response: %v", err)
                w.WriteHeader(http.StatusInternalServerError)
                json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save survey response"})
                return
            }
        }
    }

    // Mark session as completed
    _, err = tx.Exec(`
        UPDATE gd_sessions 
        SET status = 'completed', end_time = NOW()
        WHERE id = ?`,
        req.SessionID)
    if err != nil {
        tx.Rollback()
        log.Printf("Failed to complete session: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to complete session"})
        return
    }

    if err := tx.Commit(); err != nil {
        log.Printf("Error committing transaction: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save survey"})
        return
    }

    log.Printf("Successfully processed survey submission for student %s in session %s", studentID, req.SessionID)
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

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
        "pending": true,
        "lobby": true,
        "active": true,
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
func GetResults(w http.ResponseWriter, r *http.Request) {
    sessionID := r.URL.Query().Get("session_id")
    studentID := r.Context().Value("studentID").(string)

    log.Printf("Fetching results for session %s, student %s", sessionID, studentID)

    // Get participants
    var participants []struct {
        ID   string `json:"id"`
        Name string `json:"name"`
    }

    participantRows, err := database.GetDB().Query(`
        SELECT DISTINCT su.id, su.full_name 
        FROM session_participants sp
        JOIN student_users su ON sp.student_id = su.id
        WHERE sp.session_id = ? AND sp.is_dummy = FALSE`,
        sessionID)

    if err != nil {
        log.Printf("Error fetching participants: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }
    defer participantRows.Close()
    
    for participantRows.Next() {
        var p struct {
            ID   string `json:"id"`
            Name string `json:"name"`
        }
        if err := participantRows.Scan(&p.ID, &p.Name); err != nil {
            log.Printf("Error scanning participant: %v", err)
            continue
        }
        participants = append(participants, p)
    }

    // Calculate scores with penalties
    type Result struct {
        ResponderID  string  `json:"responder_id"`
        Name        string  `json:"name"`
        TotalScore  float64 `json:"total_score"`
        Penalty     int     `json:"penalty_points"`
        FinalScore  float64 `json:"final_score"`
    }

    var results []Result
    
    // First get all scores
    for _, p := range participants {
        var totalScore float64
        err := database.GetDB().QueryRow(`
            SELECT COALESCE(SUM(score), 0)
            FROM survey_results
            WHERE responder_id = ? AND session_id = ?`,
            p.ID, sessionID).Scan(&totalScore)
        if err != nil {
            log.Printf("Error calculating score: %v", err)
            continue
        }

        // Get penalties
        var penalty int
        err = database.GetDB().QueryRow(`
            SELECT COALESCE(SUM(penalty_points), 0)
            FROM survey_penalties
            WHERE student_id = ? AND session_id = ?`,
            p.ID, sessionID).Scan(&penalty)
        if err != nil {
            log.Printf("Error getting penalties: %v", err)
            penalty = 0
        }

        results = append(results, Result{
            ResponderID: p.ID,
            Name:       p.Name,
            TotalScore: totalScore,
            Penalty:    penalty,
            FinalScore: totalScore - float64(penalty),
        })
    }

    // Sort by final score
    sort.Slice(results, func(i, j int) bool {
        return results[i].FinalScore > results[j].FinalScore
    })

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "results":      results,
        "participants": participants,
    })
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

func GetSessionParticipants(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    sessionID := r.URL.Query().Get("session_id")
    if sessionID == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]interface{}{
            "error": "session_id is required",
            "data": []interface{}{},
        })
        return
    }

    studentID := r.Context().Value("studentID").(string)

    // Only get participants who have phase tracking (QR scanned students)
    rows, err := database.GetDB().Query(`
        SELECT DISTINCT su.id, su.full_name, su.department 
        FROM session_participants sp
        JOIN student_users su ON sp.student_id = su.id
        JOIN session_phase_tracking spt ON sp.session_id = spt.session_id 
                                      AND sp.student_id = spt.student_id
        WHERE sp.session_id = ? 
          AND sp.student_id != ? 
          AND sp.is_dummy = FALSE
          AND su.is_active = TRUE
        ORDER BY su.full_name`, sessionID, studentID)

    if err != nil {
        log.Printf("Database error fetching participants: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]interface{}{
            "error": "Database error",
            "data": []interface{}{},
        })
        return
    }
    defer rows.Close()

    var participants []map[string]interface{}
    for rows.Next() {
        var participant struct {
            ID         string
            FullName   string
            Department string
        }
        if err := rows.Scan(&participant.ID, &participant.FullName, &participant.Department); err != nil {
            log.Printf("Error scanning participant: %v", err)
            continue
        }

        participants = append(participants, map[string]interface{}{
            "id":         participant.ID,
            "name":      participant.FullName,
            "department": participant.Department,
        })
    }

    if len(participants) == 0 {
        w.WriteHeader(http.StatusNotFound)
        json.NewEncoder(w).Encode(map[string]interface{}{
            "error": "No participants found",
            "data": []interface{}{},
        })
        return
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

    var (
        totalParticipants int
        completedCount   int
    )

    // Get total participants
    err := database.GetDB().QueryRow(`
        SELECT COUNT(*) 
        FROM session_participants 
        WHERE session_id = ? AND is_dummy = FALSE`,
        sessionID).Scan(&totalParticipants)
    
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }

    // Get completed count
    err = database.GetDB().QueryRow(`
        SELECT COUNT(DISTINCT student_id) 
        FROM survey_completion 
        WHERE session_id = ?`,
        sessionID).Scan(&completedCount)
    
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "all_completed": completedCount >= totalParticipants,
        "completed":     completedCount,
        "total":         totalParticipants,
    })
}