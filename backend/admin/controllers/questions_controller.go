// backend/admin/controllers/question_controller.go
package controllers

import (
	// "database/sql"
	"encoding/json"
	"net/http"
	"gd/database"
)

type Question struct {
	ID              string  `json:"id"`
	Text            string  `json:"text"`
	Weight          float64 `json:"weight"`
	ApplicableLevels []int   `json:"applicable_levels"`
}

func GetQuestions(w http.ResponseWriter, r *http.Request) {
	rows, err := database.GetDB().Query(`
		SELECT id, text, weight, applicable_levels 
		FROM survey_questions
		ORDER BY created_at DESC`)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	defer rows.Close()

	var questions []Question
	for rows.Next() {
		var q Question
		var levelsJSON []byte
		if err := rows.Scan(&q.ID, &q.Text, &q.Weight, &levelsJSON); err != nil {
			continue
		}
		json.Unmarshal(levelsJSON, &q.ApplicableLevels)
		questions = append(questions, q)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(questions)
}

func CreateQuestion(w http.ResponseWriter, r *http.Request) {
	var q struct {
		Text            string  `json:"text"`
		Weight          float64 `json:"weight"`
		ApplicableLevels []int   `json:"applicable_levels"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&q); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	levelsJSON, _ := json.Marshal(q.ApplicableLevels)
	
	_, err := database.GetDB().Exec(`
		INSERT INTO survey_questions 
		(id, text, weight, applicable_levels) 
		VALUES (UUID(), ?, ?, ?)`,
		q.Text, q.Weight, levelsJSON)
	
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create question"})
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func UpdateQuestion(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Question ID required"})
		return
	}

	var q struct {
		Text            string  `json:"text"`
		Weight          float64 `json:"weight"`
		ApplicableLevels []int   `json:"applicable_levels"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&q); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	levelsJSON, _ := json.Marshal(q.ApplicableLevels)
	
	_, err := database.GetDB().Exec(`
		UPDATE survey_questions 
		SET text = ?, weight = ?, applicable_levels = ?
		WHERE id = ?`,
		q.Text, q.Weight, levelsJSON, id)
	
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update question"})
		return
	}

	w.WriteHeader(http.StatusOK)
}

func DeleteQuestion(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Question ID required"})
		return
	}

	_, err := database.GetDB().Exec("DELETE FROM survey_questions WHERE id = ?", id)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete question"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}