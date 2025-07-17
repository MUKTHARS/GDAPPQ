package controllers

import (
	// "database/sql"
	"encoding/json"
	// "gd/admin/models"
	"gd/admin/utils"
	// "log"
	"net/http"
    
)

 // Assume initialized in main.go

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func AdminLogin(w http.ResponseWriter, r *http.Request) {
    var req LoginRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
        return
    }

    // Hardcoded admin credentials for testing
    if req.Email != "admin@example.com" || req.Password != "admin123" {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid credentials"})
        return
    }

    token, err := jwt.GenerateToken("admin1", "admin")
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to generate token"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "token": token,
        "token_type": "Bearer",
    })
}

