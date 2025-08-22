package controllers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"gd/database"
)

func GetQuestionsForStudent(w http.ResponseWriter, r *http.Request) {
    levelStr := r.URL.Query().Get("level")
    studentID := r.Context().Value("studentID").(string)
    
    log.Printf("GetQuestionsForStudent called with level: %s, studentID: %s", levelStr, studentID)
    
    level, err := strconv.Atoi(levelStr)
    if err != nil {
        log.Printf("Invalid level parameter: %s", levelStr)
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid level"})
        return
    }

    log.Printf("Querying questions for level: %d", level)
    
    // FIXED: Direct query without JOIN since level is in survey_questions table
    rows, err := database.GetDB().Query(`
        SELECT id, question_text, weight 
        FROM survey_questions 
        WHERE level = ? AND is_active = TRUE
        ORDER BY created_at`, level)
    
    if err != nil {
        log.Printf("Database error: %v", err)
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
            log.Printf("Error scanning row: %v", err)
            continue
        }
        questions = append(questions, map[string]interface{}{
            "id":     question.ID,
            "text":   question.Text,
            "weight": question.Weight,
        })
    }

    log.Printf("Found %d questions for level %d", len(questions), level)

    // If no questions found, use defaults
    if len(questions) == 0 {
        log.Printf("No questions found for level %d, using fallback questions", level)
        questions = []map[string]interface{}{
            {"id": "q1", "text": "Clarity of arguments", "weight": 1.0},
            {"id": "q2", "text": "Contribution to discussion", "weight": 1.0},
            {"id": "q3", "text": "Teamwork and collaboration", "weight": 1.0},
        }
    }

    // Create a consistent but user-specific shuffle seed
    sessionID := r.URL.Query().Get("session_id")
    shuffleSeed := studentID
    if sessionID != "" {
        shuffleSeed += sessionID
    }

    log.Printf("Shuffling questions with seed: %s", shuffleSeed)

    // Shuffle questions using a consistent seed for this user
    shuffledQuestions := shuffleQuestionsWithSeed(questions, shuffleSeed)

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(shuffledQuestions)
}