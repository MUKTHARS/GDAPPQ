package controllers

import (
	"encoding/json"
	"gd/admin/models"
	"gd/database"
	"log"
	"net/http"
	"strconv"
	"time"
)

type SessionRequest struct {
	VenueID     string            `json:"venue_id"`
	Level       int               `json:"level"`
	StartTime   time.Time         `json:"start_time"`
	Agenda      map[string]int    `json:"agenda"`
	SurveyWeights map[string]float64 `json:"survey_weights"`
}

func CreateBulkSessions(w http.ResponseWriter, r *http.Request) {
    log.Println("CreateBulkSessions endpoint hit")
    db := database.GetDB()
    var requestData struct {
        Sessions []models.Session `json:"sessions"`
    }
    
    if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
        log.Printf("Error decoding session data: %v", err)
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request data"})
        return
    }
    
    log.Printf("Attempting to create %d sessions", len(requestData.Sessions))
    
    if err := models.BulkCreateSessions(db, requestData.Sessions); err != nil {
        log.Printf("Error creating sessions: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Session creation failed"})
        return
    }
    
    log.Println("Sessions created successfully")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{"message": "Sessions created successfully"})
}

func GetAvailableSessions(w http.ResponseWriter, r *http.Request) {
    levelStr := r.URL.Query().Get("level")
    level, err := strconv.Atoi(levelStr)
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid level"})
        return
    }

    rows, err := database.GetDB().Query(
        `SELECT s.id, v.id as venue_id, v.name as venue_name, s.start_time 
        FROM gd_sessions s
        JOIN venues v ON s.venue_id = v.id
        WHERE s.level = ? AND s.status = 'pending' 
        AND s.start_time > NOW()`,
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
            VenueName string
            StartTime time.Time
        }
        if err := rows.Scan(&session.ID, &session.VenueID, &session.VenueName, &session.StartTime); err != nil {
            continue
        }

        sessions = append(sessions, map[string]interface{}{
            "id":         session.ID,
            "venue_id":    session.VenueID,
            "venue":       session.VenueName, // Add venue name to response
            "start_time":  session.StartTime,
        })
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(sessions)
}