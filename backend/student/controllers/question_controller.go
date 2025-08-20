// C:\xampp\htdocs\GDAPPC\backend\student\controllers\question_controller.go
package controllers

import (
	// "database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"gd/database"
)

func GetQuestionsForStudent(w http.ResponseWriter, r *http.Request) {
    levelStr := r.URL.Query().Get("level")
    studentID := r.Context().Value("studentID").(string)
    
    level, err := strconv.Atoi(levelStr)
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid level"})
        return
    }

    // Get questions for the specified level
    rows, err := database.GetDB().Query(`
        SELECT id, question_text, weight 
        FROM survey_questions sq
        JOIN question_levels ql ON sq.id = ql.question_id
        WHERE ql.level = ? AND sq.is_active = TRUE
        ORDER BY sq.created_at`, level)
    
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }
    defer rows.Close()

    var questions []map[string]interface{}
    for rows.Next() {
        var question struct {
            ID    string
            Text  string
            Weight float64
        }
        if err := rows.Scan(&question.ID, &question.Text, &question.Weight); err != nil {
            continue
        }
        questions = append(questions, map[string]interface{}{
            "id":     question.ID,
            "text":   question.Text,
            "weight": question.Weight,
        })
    }

    // If no questions found, use defaults
    if len(questions) == 0 {
        questions = []map[string]interface{}{
            {"id": "q1", "text": "Clarity of arguments", "weight": 1.0},
            {"id": "q2", "text": "Contribution to discussion", "weight": 1.0},
            {"id": "q3", "text": "Teamwork and collaboration", "weight": 1.0},
        }
    }

    // Create a consistent but user-specific shuffle seed
    // Using student ID + session ID (if available) for consistent ordering per user
    sessionID := r.URL.Query().Get("session_id")
    shuffleSeed := studentID
    if sessionID != "" {
        shuffleSeed += sessionID
    }

    // Shuffle questions using a consistent seed for this user
    shuffledQuestions := shuffleQuestionsWithSeed(questions, shuffleSeed)

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(shuffledQuestions)
}

// func GetQuestionsForStudent(w http.ResponseWriter, r *http.Request) {
//     // Get level from query params
//     levelStr := r.URL.Query().Get("level")
//     level, err := strconv.Atoi(levelStr)
//     if err != nil || level < 1 {
//         level = 1 // Default to level 1 if invalid
//     }

//     log.Printf("Fetching questions for level %d", level)

//     // Get active questions for the student's level
//     rows, err := database.GetDB().Query(`
//         SELECT id, question_text, weight 
//         FROM survey_questions
//         WHERE is_active = TRUE
//         ORDER BY created_at`)
//     if err != nil {
//         log.Printf("Database error: %v", err)
//         http.Error(w, "Database error", http.StatusInternalServerError)
//         return
//     }
//     defer rows.Close()

//     type Question struct {
//         ID      string  `json:"id"`
//         Text    string  `json:"text"`
//         Weight  float32 `json:"weight"`
//     }

//     var questions []Question
//     for rows.Next() {
//         var q Question
//         if err := rows.Scan(&q.ID, &q.Text, &q.Weight); err != nil {
//             log.Printf("Error scanning question: %v", err)
//             continue
//         }
//         questions = append(questions, q)
//     }

//     log.Printf("Returning %d questions", len(questions))
    
//     w.Header().Set("Content-Type", "application/json")
//     if err := json.NewEncoder(w).Encode(questions); err != nil {
//         log.Printf("Error encoding response: %v", err)
//     }
// }

