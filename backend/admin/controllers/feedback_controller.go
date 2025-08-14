package controllers

import (
	"database/sql"
	"encoding/json"
	"gd/database"
	"net/http"
)

func GetSessionFeedbacks(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session_id")

	rows, err := database.GetDB().Query(`
		SELECT 
			sf.id, sf.rating, sf.comments, sf.created_at,
			su.full_name, su.department, su.year
		FROM session_feedback sf
		JOIN student_users su ON sf.student_id = su.id
		WHERE sf.session_id = ?
		ORDER BY sf.created_at DESC`, sessionID)
	
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	defer rows.Close()

	type Feedback struct {
		ID        string `json:"id"`
		Rating    int    `json:"rating"`
		Comments  string `json:"comments"`
		CreatedAt string `json:"created_at"`
		Student   struct {
			Name       string `json:"name"`
			Department string `json:"department"`
			Year       int    `json:"year"`
		} `json:"student"`
	}

	var feedbacks []Feedback
	for rows.Next() {
		var f Feedback
		var createdAt sql.NullTime
		err := rows.Scan(
			&f.ID, &f.Rating, &f.Comments, &createdAt,
			&f.Student.Name, &f.Student.Department, &f.Student.Year,
		)
		if err != nil {
			continue
		}
		if createdAt.Valid {
			f.CreatedAt = createdAt.Time.Format("2006-01-02 15:04:05")
		}
		feedbacks = append(feedbacks, f)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"feedbacks": feedbacks,
		"count":     len(feedbacks),
	})
}