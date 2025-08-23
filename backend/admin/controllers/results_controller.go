package controllers

import (
	// "database/sql"
	"encoding/json"
	"net/http"
	"gd/database"
	"log"
	"strconv"
)

func GetTopParticipants(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    levelStr := r.URL.Query().Get("level")
    var level int
    var err error
    
    if levelStr != "" {
        level, err = strconv.Atoi(levelStr)
        if err != nil {
            w.WriteHeader(http.StatusBadRequest)
            json.NewEncoder(w).Encode(map[string]string{"error": "Invalid level parameter"})
            return
        }
    }

    query := `
        SELECT 
            sr.responder_id as id,
            su.full_name as name,
            su.current_gd_level as level,
            COUNT(DISTINCT sr.session_id) as session_count,
            SUM(sr.score) as total_score,
            AVG(sr.score) as avg_score
        FROM survey_results sr
        JOIN student_users su ON sr.responder_id = su.id
        LEFT JOIN gd_sessions s ON sr.session_id = s.id
        WHERE su.is_active = TRUE
    `

    if level > 0 {
        query += " AND su.current_gd_level = " + strconv.Itoa(level)  // Filter by student's level
    }

    query += `
        GROUP BY sr.responder_id, su.full_name, su.current_gd_level
        ORDER BY total_score DESC
        LIMIT 20
    `

    rows, err := database.GetDB().Query(query)
    if err != nil {
        log.Printf("Error fetching top participants: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }
    defer rows.Close()

    type TopParticipant struct {
        ID           string  `json:"id"`
        Name         string  `json:"name"`
        Level        int     `json:"level"`
        SessionCount int     `json:"session_count"`
        TotalScore   float64 `json:"total_score"`
        AvgScore     float64 `json:"avg_score"`
    }

    var results []TopParticipant
    for rows.Next() {
        var r TopParticipant
        if err := rows.Scan(&r.ID, &r.Name, &r.Level, &r.SessionCount, &r.TotalScore, &r.AvgScore); err != nil {
            log.Printf("Error scanning result: %v", err)
            continue
        }
        results = append(results, r)
    }

    json.NewEncoder(w).Encode(map[string]interface{}{
        "top_participants": results,
        "level":           level,
    })
}

