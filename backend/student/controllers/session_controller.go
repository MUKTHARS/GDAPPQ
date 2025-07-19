package controllers

import (
	"encoding/json"
	"gd/database"
	"net/http"
	"strconv"
	"time"
)

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