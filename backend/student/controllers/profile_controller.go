package controllers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"log"
	"gd/database"
)

type StudentProfile struct {
	ID              string         `json:"id"`
	Email           string         `json:"email"`
	FullName        string         `json:"full_name"`
	RollNumber      sql.NullString `json:"roll_number"` // Change from string to sql.NullString
	Department      string         `json:"department"`
	Year            sql.NullInt64  `json:"year"`
	PhotoURL        string         `json:"photo_url"`
	CurrentGDLevel  int            `json:"current_gd_level"`
	IsActive        bool           `json:"is_active"`
	CreatedAt       string         `json:"created_at"`
}

func GetStudentProfile(w http.ResponseWriter, r *http.Request) {
	// Get student ID from context (set by middleware)
	studentID := r.Context().Value("studentID").(string)
	if studentID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Student ID not found"})
		return
	}

	log.Printf("Fetching profile for student: %s", studentID)

	var profile StudentProfile
	
	err := database.GetDB().QueryRow(`
		SELECT 
			id, email, full_name, roll_number, department, year, 
			photo_url, current_gd_level, is_active, created_at
		FROM student_users 
		WHERE id = ? AND is_active = TRUE
	`, studentID).Scan(
		&profile.ID,
		&profile.Email,
		&profile.FullName,
		&profile.RollNumber, // Now accepts sql.NullString
		&profile.Department,
		&profile.Year,
		&profile.PhotoURL,
		&profile.CurrentGDLevel,
		&profile.IsActive,
		&profile.CreatedAt,
	)

	if err != nil {
		log.Printf("Database error for student %s: %v", studentID, err)
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Student profile not found"})
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error: " + err.Error()})
		}
		return
	}

	// Prepare response with proper handling of nullable fields
	response := map[string]interface{}{
		"id":               profile.ID,
		"email":            profile.Email,
		"full_name":        profile.FullName,
		"roll_number":      nil, // Default to null
		"department":       profile.Department,
		"year":             nil, // Default to null
		"photo_url":        profile.PhotoURL,
		"current_gd_level": profile.CurrentGDLevel,
		"is_active":        profile.IsActive,
		"created_at":       profile.CreatedAt,
	}

	// If roll_number is valid, use the string value
	if profile.RollNumber.Valid {
		response["roll_number"] = profile.RollNumber.String
	}

	// If year is valid, use the integer value
	if profile.Year.Valid {
		response["year"] = profile.Year.Int64
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"profile": response,
	})
}