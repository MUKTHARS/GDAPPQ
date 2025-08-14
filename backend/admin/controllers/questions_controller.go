package controllers

import (
	// "database/sql"
	"encoding/json"
	"gd/database"
	"log"
	"net/http"
	"strconv"
	// "strings"

	"github.com/google/uuid"
)

type Question struct {
	ID      string  `json:"id"`
	Text    string  `json:"text"`
	Weight  float64 `json:"weight"`
	Levels  []int   `json:"levels"`
}

type QuestionRequest struct {
	Text   string  `json:"text"`
	Weight float64 `json:"weight"`
	Levels []int   `json:"levels"`
}

func GetQuestions(w http.ResponseWriter, r *http.Request) {
    levelStr := r.URL.Query().Get("level")
    level, err := strconv.Atoi(levelStr)
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid level parameter"})
        return
    }

    rows, err := database.GetDB().Query(`
        SELECT q.id, q.question_text, q.weight 
        FROM survey_questions q
        JOIN question_levels l ON q.id = l.question_id
        WHERE l.level = ? AND q.is_active = TRUE
        ORDER BY q.created_at`, level)
    
    if err != nil {
        log.Printf("Database error: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
        return
    }
    defer rows.Close()

    var questions []Question
    for rows.Next() {
        var q Question
        if err := rows.Scan(&q.ID, &q.Text, &q.Weight); err != nil {
            log.Printf("Error scanning question: %v", err)
            continue
        }
        questions = append(questions, q)
    }

    if len(questions) == 0 {
        log.Println("No questions found for level", level)
        // Return empty array instead of error to trigger fallback
        questions = []Question{}
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(questions)
}

func CreateQuestion(w http.ResponseWriter, r *http.Request) {
	var req QuestionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	if req.Text == "" || len(req.Levels) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Text and levels are required"})
		return
	}

	tx, err := database.GetDB().Begin()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	defer tx.Rollback()

	questionID := uuid.New().String()
	_, err = tx.Exec(`
		INSERT INTO survey_questions (id, question_text, weight)
		VALUES (?, ?, ?)`,
		questionID, req.Text, req.Weight)
	
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create question"})
		return
	}

	for _, level := range req.Levels {
		_, err = tx.Exec(`
			INSERT INTO question_levels (question_id, level)
			VALUES (?, ?)`,
			questionID, level)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to assign levels"})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save question"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
		"id":     questionID,
	})
}

func UpdateQuestion(w http.ResponseWriter, r *http.Request) {
	questionID := r.URL.Query().Get("id")
	if questionID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Question ID is required"})
		return
	}

	 var req struct {
        ID      string   `json:"id"`
        Text    *string  `json:"text"`
        Weight  *float64 `json:"weight"`
        Levels  []int    `json:"levels"`
        Active  *bool    `json:"is_active"`
    }
    
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
        return
    }

    if req.ID == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Question ID is required"})
        return
    }

	tx, err := database.GetDB().Begin()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	defer tx.Rollback()

	// Update question fields if provided
	if req.Text != nil || req.Weight != nil || req.Active != nil {
		query := "UPDATE survey_questions SET "
		var args []interface{}
		
		if req.Text != nil {
			query += "question_text = ?, "
			args = append(args, *req.Text)
		}
		if req.Weight != nil {
			query += "weight = ?, "
			args = append(args, *req.Weight)
		}
		if req.Active != nil {
			query += "is_active = ?, "
			args = append(args, *req.Active)
		}
		
		query = query[:len(query)-2] + " WHERE id = ?"
		args = append(args, questionID)
		
		_, err = tx.Exec(query, args...)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update question"})
			return
		}
	}

	// Update levels if provided
	if req.Levels != nil {
		// First delete existing level mappings
		_, err = tx.Exec("DELETE FROM question_levels WHERE question_id = ?", questionID)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update levels"})
			return
		}

		// Add new level mappings
		for _, level := range req.Levels {
			_, err = tx.Exec(`
				INSERT INTO question_levels (question_id, level)
				VALUES (?, ?)`,
				questionID, level)
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update levels"})
				return
			}
		}
	}

	if err := tx.Commit(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update question"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func DeleteQuestion(w http.ResponseWriter, r *http.Request) {
	questionID := r.URL.Query().Get("id")
	if questionID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Question ID is required"})
		return
	}

	_, err := database.GetDB().Exec("DELETE FROM survey_questions WHERE id = ?", questionID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete question"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}