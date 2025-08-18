// C:\xampp\htdocs\GDAPPC\backend\student\controllers\question_controller.go
package controllers

import (
	// "database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"log"

	"gd/database"
)

func GetQuestionsForStudent(w http.ResponseWriter, r *http.Request) {
    // Get level from query params
    levelStr := r.URL.Query().Get("level")
    level, err := strconv.Atoi(levelStr)
    if err != nil || level < 1 {
        level = 1 // Default to level 1 if invalid
    }

    log.Printf("Fetching questions for level %d", level)

    // Get active questions for the student's level
    rows, err := database.GetDB().Query(`
        SELECT id, question_text, weight 
        FROM survey_questions
        WHERE is_active = TRUE
        ORDER BY created_at`)
    if err != nil {
        log.Printf("Database error: %v", err)
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }
    defer rows.Close()

    type Question struct {
        ID      string  `json:"id"`
        Text    string  `json:"text"`
        Weight  float32 `json:"weight"`
    }

    var questions []Question
    for rows.Next() {
        var q Question
        if err := rows.Scan(&q.ID, &q.Text, &q.Weight); err != nil {
            log.Printf("Error scanning question: %v", err)
            continue
        }
        questions = append(questions, q)
    }

    log.Printf("Returning %d questions", len(questions))
    
    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(questions); err != nil {
        log.Printf("Error encoding response: %v", err)
    }
}

