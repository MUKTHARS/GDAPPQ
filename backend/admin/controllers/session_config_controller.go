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

	"github.com/google/uuid"
)

type SessionConfig struct {
	PrepTime     int `json:"prep_time"`
	Discussion   int `json:"discussion"`
	Survey       int `json:"survey"`
	Level        int `json:"level"`
	VenueID      string `json:"venue_id"`
	SurveyWeights map[string]float64 `json:"survey_weights"`
}
type SessionRequest struct {
	VenueID       string                 `json:"venue_id"`
	Level         int                    `json:"level"`
	StartTime     time.Time              `json:"start_time"`
	EndTime       time.Time              `json:"end_time"`
	Agenda        map[string]interface{} `json:"agenda"`
	SurveyWeights map[string]float64     `json:"survey_weights"`
}
func CreateBulkSessions(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Sessions []SessionRequest `json:"sessions"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
		return
	}

	if len(request.Sessions) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "No sessions provided"})
		return
	}

	tx, err := database.GetDB().Begin()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	defer tx.Rollback()

	var createdSessions []map[string]interface{}

	for _, session := range request.Sessions {
		sessionID := uuid.New().String()
		
		agendaJSON, err := json.Marshal(session.Agenda)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to marshal agenda"})
			return
		}

		surveyWeightsJSON, err := json.Marshal(session.SurveyWeights)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to marshal survey weights"})
			return
		}

		_, err = tx.Exec(`
			INSERT INTO gd_sessions 
			(id, venue_id, level, start_time, end_time, agenda, survey_weights, status) 
			VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
			sessionID,
			session.VenueID,
			session.Level,
			session.StartTime,
			session.EndTime,
			agendaJSON,
			surveyWeightsJSON,
		)

		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create session: " + err.Error()})
			return
		}

		createdSessions = append(createdSessions, map[string]interface{}{
			"id":         sessionID,
			"venue_id":   session.VenueID,
			"start_time": session.StartTime,
			"end_time":   session.EndTime,
		})
	}

	if err := tx.Commit(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to commit transaction"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   "success",
		"sessions": createdSessions,
	})
}

// func CreateBulkSessions(w http.ResponseWriter, r *http.Request) {
//     log.Println("CreateBulkSessions endpoint hit")
    
//     var request struct {
//         Sessions []struct {
//             VenueID      string                 `json:"venue_id"`
//             Level        int                    `json:"level"`
//             StartTime    string                 `json:"start_time"`
//             Agenda       map[string]interface{} `json:"agenda"`
//             SurveyWeights map[string]float64    `json:"survey_weights"`
//         } `json:"sessions"`
//     }

//     if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
//         log.Printf("Error decoding request: %v", err)
//         w.WriteHeader(http.StatusBadRequest)
//         json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
//         return
//     }

//     if len(request.Sessions) == 0 {
//         log.Println("No sessions provided in request")
//         w.WriteHeader(http.StatusBadRequest)
//         json.NewEncoder(w).Encode(map[string]string{"error": "No sessions provided"})
//         return
//     }

//     tx, err := database.GetDB().Begin()
//     if err != nil {
//         log.Printf("Error starting transaction: %v", err)
//         w.WriteHeader(http.StatusInternalServerError)
//         json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
//         return
//     }
//     defer tx.Rollback()

//     for _, session := range request.Sessions {
//         log.Printf("Processing session for venue %s", session.VenueID)

//         // Validate agenda times
//         prepTime, ok := session.Agenda["prep_time"].(float64)
//         if !ok || prepTime <= 0 {
//             prepTime = 60 // Default value if not provided or invalid
//         }
        
//         discussionTime, ok := session.Agenda["discussion"].(float64)
//         if !ok || discussionTime <= 0 {
//             discussionTime = 60 // Default value if not provided or invalid
//         }
        
//         surveyTime, ok := session.Agenda["survey"].(float64)
//         if !ok || surveyTime <= 0 {
//             surveyTime = 60 // Default value if not provided or invalid
//         }

//         // Create standardized agenda
//         standardizedAgenda := map[string]int{
//             "prep_time":  int(prepTime),
//             "discussion": int(discussionTime),
//             "survey":     int(surveyTime),
//         }

//         // Parse the ISO8601 timestamp into MySQL compatible format
//         startTime, err := time.Parse(time.RFC3339, session.StartTime)
//         if err != nil {
//             log.Printf("Error parsing start time: %v", err)
//             w.WriteHeader(http.StatusBadRequest)
//             json.NewEncoder(w).Encode(map[string]string{"error": "Invalid start time format"})
//             return
//         }
//         mysqlTime := startTime.Format("2006-01-02 15:04:05")

//         // Convert agenda to JSON
//         agendaJSON, err := json.Marshal(standardizedAgenda)
//         if err != nil {
//             log.Printf("Error marshaling agenda: %v", err)
//             w.WriteHeader(http.StatusInternalServerError)
//             json.NewEncoder(w).Encode(map[string]string{"error": "Failed to process agenda"})
//             return
//         }

//         // Calculate total duration
//          totalSeconds := int(prepTime + discussionTime + surveyTime)

//         log.Printf("Inserting session with total duration %d minutes", totalSeconds )
// totalMinutes := totalSeconds / 60
//         // Insert session into gd_sessions table
//         _, err = tx.Exec(`
//             INSERT INTO gd_sessions (
//                 id, venue_id, level, start_time, end_time, 
//                 agenda, survey_weights, status
//             ) VALUES (
//                 UUID(), ?, ?, ?, 
//                 DATE_ADD(?, INTERVAL ? MINUTE), 
//                 ?, ?, 'pending'
//             )`,
//             session.VenueID,
//             session.Level,
//             mysqlTime, // Use the formatted MySQL time
//             mysqlTime, // Use the formatted MySQL time
//             totalMinutes,
//             string(agendaJSON),
//             // string(weightsJSON),
//         )

//         if err != nil {
//             log.Printf("Error inserting session: %v", err)
//             w.WriteHeader(http.StatusInternalServerError)
//             json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create session: " + err.Error()})
//             return
//         }
//     }

//     if err := tx.Commit(); err != nil {
//         log.Printf("Error committing transaction: %v", err)
//         w.WriteHeader(http.StatusInternalServerError)
//         json.NewEncoder(w).Encode(map[string]string{"error": "Failed to commit transaction"})
//         return
//     }

//     log.Println("Successfully created bulk sessions")
//     w.Header().Set("Content-Type", "application/json")
//     json.NewEncoder(w).Encode(map[string]string{"status": "success"})
// }

// func CreateBulkSessions(w http.ResponseWriter, r *http.Request) {
//     log.Println("CreateBulkSessions endpoint hit")
    
//     var request struct {
//         Sessions []struct {
//             VenueID      string                 `json:"venue_id"`
//             Level        int                    `json:"level"`
//             StartTime    string                 `json:"start_time"`
//             Agenda       map[string]interface{} `json:"agenda"`
//             SurveyWeights map[string]float64    `json:"survey_weights"`
//         } `json:"sessions"`
//     }


	

//     if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
//         log.Printf("Error decoding request: %v", err)
//         w.WriteHeader(http.StatusBadRequest)
//         json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
//         return
//     }

//     if len(request.Sessions) == 0 {
//         log.Println("No sessions provided in request")
//         w.WriteHeader(http.StatusBadRequest)
//         json.NewEncoder(w).Encode(map[string]string{"error": "No sessions provided"})
//         return
//     }

//     tx, err := database.GetDB().Begin()
//     if err != nil {
//         log.Printf("Error starting transaction: %v", err)
//         w.WriteHeader(http.StatusInternalServerError)
//         json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
//         return
//     }
//     defer tx.Rollback()

//     for _, session := range request.Sessions {
//         log.Printf("Processing session for venue %s", session.VenueID)

//         // Parse the ISO8601 timestamp into MySQL compatible format
//         startTime, err := time.Parse(time.RFC3339, session.StartTime)
//         if err != nil {
//             log.Printf("Error parsing start time: %v", err)
//             w.WriteHeader(http.StatusBadRequest)
//             json.NewEncoder(w).Encode(map[string]string{"error": "Invalid start time format"})
//             return
//         }
//         mysqlTime := startTime.Format("2006-01-02 15:04:05")

//         // Convert agenda to JSON
//         agendaJSON, err := json.Marshal(session.Agenda)
//         if err != nil {
//             log.Printf("Error marshaling agenda: %v", err)
//             w.WriteHeader(http.StatusInternalServerError)
//             json.NewEncoder(w).Encode(map[string]string{"error": "Failed to process agenda"})
//             return
//         }
// if session.Agenda["prep_time"] == nil || session.Agenda["discussion"] == nil || session.Agenda["survey"] == nil {
//     log.Printf("Incomplete agenda configuration")
//     w.WriteHeader(http.StatusBadRequest)
//     json.NewEncoder(w).Encode(map[string]string{"error": "All agenda times must be specified"})
//     return
// }
//         // Convert survey weights to JSON
//         weightsJSON, err := json.Marshal(session.SurveyWeights)
//         if err != nil {
//             log.Printf("Error marshaling survey weights: %v", err)
//             w.WriteHeader(http.StatusInternalServerError)
//             json.NewEncoder(w).Encode(map[string]string{"error": "Failed to process survey weights"})
//             return
//         }

//         // Calculate total duration
//         totalMinutes := 0
//         if prep, ok := session.Agenda["prep_time"].(float64); ok {
//             totalMinutes += int(prep)
//         }
//         if discussion, ok := session.Agenda["discussion"].(float64); ok {
//             totalMinutes += int(discussion)
//         }
//         if survey, ok := session.Agenda["survey"].(float64); ok {
//             totalMinutes += int(survey)
//         }

//         log.Printf("Inserting session with total duration %d minutes", totalMinutes)

//         // Insert session into gd_sessions table
//         _, err = tx.Exec(`
//             INSERT INTO gd_sessions (
//                 id, venue_id, level, start_time, end_time, 
//                 agenda, survey_weights, status
//             ) VALUES (
//                 UUID(), ?, ?, ?, 
//                 DATE_ADD(?, INTERVAL ? MINUTE), 
//                 ?, ?, 'pending'
//             )`,
//             session.VenueID,
//             session.Level,
//             mysqlTime, // Use the formatted MySQL time
//             mysqlTime, // Use the formatted MySQL time
//             totalMinutes,
//             string(agendaJSON),
//             string(weightsJSON),
//         )

//         if err != nil {
//             log.Printf("Error inserting session: %v", err)
//             w.WriteHeader(http.StatusInternalServerError)
//             json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create session: " + err.Error()})
//             return
//         }
//     }

//     if err := tx.Commit(); err != nil {
//         log.Printf("Error committing transaction: %v", err)
//         w.WriteHeader(http.StatusInternalServerError)
//         json.NewEncoder(w).Encode(map[string]string{"error": "Failed to commit transaction"})
//         return
//     }

//     log.Println("Successfully created bulk sessions")
//     w.Header().Set("Content-Type", "application/json")
//     json.NewEncoder(w).Encode(map[string]string{"status": "success"})
// }


func GetSessionRules(w http.ResponseWriter, r *http.Request) {
    sessionID := r.URL.Query().Get("session_id")
    if sessionID == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "session_id is required"})
        return
    }

    // Get session details including agenda
    var agendaJSON []byte
    err := database.GetDB().QueryRow(`
        SELECT agenda FROM gd_sessions WHERE id = ?`,
        sessionID,
    ).Scan(&agendaJSON)

    if err != nil {
        if err == sql.ErrNoRows {
            w.WriteHeader(http.StatusNotFound)
            json.NewEncoder(w).Encode(map[string]string{"error": "Session not found"})
        } else {
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        }
        return
    }

    // Parse agenda with defaults
    var agenda struct {
        PrepTime   int `json:"prep_time"`
        Discussion int `json:"discussion"`
        Survey     int `json:"survey"`
    }
    
    // Set default values
    agenda.PrepTime = 5
    agenda.Discussion = 20
    agenda.Survey = 5
    
    if len(agendaJSON) > 0 {
        if err := json.Unmarshal(agendaJSON, &agenda); err != nil {
            log.Printf("Error parsing agenda JSON: %v", err)
            // Use defaults if parsing fails
        }
    }

    response := map[string]interface{}{
        "prep_time":       agenda.PrepTime,
        "discussion_time": agenda.Discussion,
        "survey_time":      agenda.Survey,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}
func UpdateSessionRules(w http.ResponseWriter, r *http.Request) {
    var request struct {
        SessionID string `json:"session_id"`
        PrepTime  int    `json:"prep_time"`
        Discussion int   `json:"discussion_time"`
        Survey    int    `json:"survey_time"`
    }

    if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
        return
    }

    // Create new agenda
    newAgenda := map[string]int{
        "prep_time":  request.PrepTime,
        "discussion": request.Discussion,
        "survey":     request.Survey,
    }

    agendaJSON, err := json.Marshal(newAgenda)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create agenda"})
        return
    }

    // Calculate total duration
    totalMinutes := request.PrepTime + request.Discussion + request.Survey

    // Update session with new agenda and recalculated end time
    _, err = database.GetDB().Exec(`
        UPDATE gd_sessions 
        SET agenda = ?,
            end_time = DATE_ADD(start_time, INTERVAL ? MINUTE)
        WHERE id = ?`,
        string(agendaJSON),
        totalMinutes,
        request.SessionID,
    )

    if err != nil {
        log.Printf("Error updating session rules: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update rules"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}
// func UpdateSessionRules(w http.ResponseWriter, r *http.Request) {
//     var rules struct {
//         Level          int     `json:"level"`
//         PrepTime      int     `json:"prep_time"`
//         DiscussionTime int     `json:"discussion_time"`
//         SurveyTime    int     `json:"survey_time"`
//         PenaltyThreshold float64 `json:"penalty_threshold"`
//     }

//     if err := json.NewDecoder(r.Body).Decode(&rules); err != nil {
//         w.WriteHeader(http.StatusBadRequest)
//         json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
//         return
//     }

//     // Upsert the rules for the specified level
//     _, err := database.GetDB().Exec(`
//         INSERT INTO gd_rules 
//         (level, prep_time, discussion_time, survey_time, penalty_threshold)
//         VALUES (?, ?, ?, ?, ?)
//         ON DUPLICATE KEY UPDATE
//         prep_time = VALUES(prep_time),
//         discussion_time = VALUES(discussion_time),
//         survey_time = VALUES(survey_time),
//         penalty_threshold = VALUES(penalty_threshold)`,
//         rules.Level, rules.PrepTime, rules.DiscussionTime, 
//         rules.SurveyTime, rules.PenaltyThreshold,
//     )

//     if err != nil {
//         log.Printf("Error updating session rules: %v", err)
//         w.WriteHeader(http.StatusInternalServerError)
//         json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update rules"})
//         return
//     }

//     w.Header().Set("Content-Type", "application/json")
//     json.NewEncoder(w).Encode(map[string]string{"status": "success"})
// }

// func GetSessionRules(w http.ResponseWriter, r *http.Request) {
// 	var rules struct {
// 		PrepTime       int     `json:"prep_time"`
// 		DiscussionTime int     `json:"discussion_time"`
// 		SurveyTime     int     `json:"survey_time"`
// 		PenaltyThreshold float64 `json:"penalty_threshold"`
// 	}

// 	err := database.GetDB().QueryRow(`
// 		SELECT prep_time, discussion_time, penalty_threshold 
// 		FROM gd_rules 
// 		WHERE level = ?`,
// 		r.URL.Query().Get("level"),
// 	).Scan(&rules.PrepTime, &rules.DiscussionTime, &rules.PenaltyThreshold)

// 	if err != nil {
// 		if err == sql.ErrNoRows {
// 			// Return default values if no rules found
// 			rules.PrepTime = 5
// 			rules.DiscussionTime = 20
// 			rules.SurveyTime = 5
// 			rules.PenaltyThreshold = 2.5
// 		} else {
// 			w.WriteHeader(http.StatusInternalServerError)
// 			json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
// 			return
// 		}
// 	}

// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(rules)
// }