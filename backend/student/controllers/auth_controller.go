package controllers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"gd/student/utils"
	"gd/database"
	"golang.org/x/crypto/bcrypt"
	"log"
)

type StudentLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func StudentLogin(w http.ResponseWriter, r *http.Request) {
    var req StudentLoginRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
        return
    }

    log.Printf("Login attempt for: %s", req.Email) // Debug log
    
    var student struct {
        ID           string
        PasswordHash string
        Level        int
    }
    
    err := database.GetDB().QueryRow(
        `SELECT id, password_hash, current_gd_level 
        FROM student_users 
        WHERE email = ? AND is_active = TRUE`,
        req.Email,
    ).Scan(&student.ID, &student.PasswordHash, &student.Level)

    if err != nil {
        log.Printf("Database error for %s: %v", req.Email, err) // Debug log
        if err == sql.ErrNoRows {
            w.WriteHeader(http.StatusUnauthorized)
            json.NewEncoder(w).Encode(map[string]string{"error": "Invalid credentials"})
        } else {
            w.WriteHeader(http.StatusInternalServerError)
        }
        return
    }

    log.Printf("Found student: %s", student.ID) // Debug log
    
    // Compare password
    err = bcrypt.CompareHashAndPassword([]byte(student.PasswordHash), []byte(req.Password))
    if err != nil {
        log.Printf("Password mismatch for %s", req.Email) // Debug log
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid credentials"})
        return
    }
log.Printf("Found student: %s, level: %d", student.ID, student.Level)
	// Generate JWT token
	token, err := jwt.GenerateStudentToken(student.ID, student.Level)
	if err != nil {
		log.Printf("Token generation error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
    "token": token,
    "level": student.Level,
    "user_id": student.ID, 
})
}

