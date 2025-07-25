// backend/admin/controllers/session_config_controller.go
package controllers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	// "time"

	"gd/database"
)

type SessionConfig struct {
	PrepTime     int `json:"prep_time"`
	Discussion   int `json:"discussion"`
	Survey       int `json:"survey"`
	Level        int `json:"level"`
	VenueID      string `json:"venue_id"`
	SurveyWeights map[string]float64 `json:"survey_weights"`
}


func CreateBulkSessions(w http.ResponseWriter, r *http.Request) {
    log.Println("CreateBulkSessions endpoint hit")
    
    var request struct {
        Sessions []struct {
            VenueID      string                 `json:"venue_id"`
            Level        int                    `json:"level"`
            StartTime    string                 `json:"start_time"`
            Agenda       map[string]interface{} `json:"agenda"`
            SurveyWeights map[string]float64    `json:"survey_weights"`
        } `json:"sessions"`
    }

    if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
        log.Printf("Error decoding request: %v", err)
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
        return
    }

    if len(request.Sessions) == 0 {
        log.Println("No sessions provided in request")
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "No sessions provided"})
        return
    }

    tx, err := database.GetDB().Begin()
    if err != nil {
        log.Printf("Error starting transaction: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }
    defer tx.Rollback()

    for _, session := range request.Sessions {
        log.Printf("Processing session for venue %s", session.VenueID)

        // Parse the ISO8601 timestamp into MySQL compatible format
        startTime, err := time.Parse(time.RFC3339, session.StartTime)
        if err != nil {
            log.Printf("Error parsing start time: %v", err)
            w.WriteHeader(http.StatusBadRequest)
            json.NewEncoder(w).Encode(map[string]string{"error": "Invalid start time format"})
            return
        }
        mysqlTime := startTime.Format("2006-01-02 15:04:05")

        // Convert agenda to JSON
        agendaJSON, err := json.Marshal(session.Agenda)
        if err != nil {
            log.Printf("Error marshaling agenda: %v", err)
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Failed to process agenda"})
            return
        }

        // Convert survey weights to JSON
        weightsJSON, err := json.Marshal(session.SurveyWeights)
        if err != nil {
            log.Printf("Error marshaling survey weights: %v", err)
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Failed to process survey weights"})
            return
        }

        // Calculate total duration
        totalMinutes := 0
        if prep, ok := session.Agenda["prep_time"].(float64); ok {
            totalMinutes += int(prep)
        }
        if discussion, ok := session.Agenda["discussion"].(float64); ok {
            totalMinutes += int(discussion)
        }
        if survey, ok := session.Agenda["survey"].(float64); ok {
            totalMinutes += int(survey)
        }

        log.Printf("Inserting session with total duration %d minutes", totalMinutes)

        // Insert session into gd_sessions table
        _, err = tx.Exec(`
            INSERT INTO gd_sessions (
                id, venue_id, level, start_time, end_time, 
                agenda, survey_weights, status
            ) VALUES (
                UUID(), ?, ?, ?, 
                DATE_ADD(?, INTERVAL ? MINUTE), 
                ?, ?, 'pending'
            )`,
            session.VenueID,
            session.Level,
            mysqlTime, // Use the formatted MySQL time
            mysqlTime, // Use the formatted MySQL time
            totalMinutes,
            string(agendaJSON),
            string(weightsJSON),
        )

        if err != nil {
            log.Printf("Error inserting session: %v", err)
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create session: " + err.Error()})
            return
        }
    }

    if err := tx.Commit(); err != nil {
        log.Printf("Error committing transaction: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to commit transaction"})
        return
    }

    log.Println("Successfully created bulk sessions")
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}



func GetSessionRules(w http.ResponseWriter, r *http.Request) {
	var rules struct {
		PrepTime       int     `json:"prep_time"`
		DiscussionTime int     `json:"discussion_time"`
		SurveyTime     int     `json:"survey_time"`
		PenaltyThreshold float64 `json:"penalty_threshold"`
	}

	err := database.GetDB().QueryRow(`
		SELECT prep_time, discussion_time, penalty_threshold 
		FROM gd_rules 
		WHERE level = ?`,
		r.URL.Query().Get("level"),
	).Scan(&rules.PrepTime, &rules.DiscussionTime, &rules.PenaltyThreshold)

	if err != nil {
		if err == sql.ErrNoRows {
			// Return default values if no rules found
			rules.PrepTime = 5
			rules.DiscussionTime = 20
			rules.SurveyTime = 5
			rules.PenaltyThreshold = 2.5
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rules)
}