package controllers

import (
	"encoding/json"
	"gd/admin/models"
	"gd/database"
	"log"
	"net/http"
	"time"
)

type SessionRequest struct {
	VenueID     string            `json:"venue_id"`
	Level       int               `json:"level"`
	StartTime   time.Time         `json:"start_time"`
	Agenda      map[string]int    `json:"agenda"`
	SurveyWeights map[string]float64 `json:"survey_weights"`
}

func CreateBulkSessions(w http.ResponseWriter, r *http.Request) {
    log.Println("CreateBulkSessions endpoint hit")
    db := database.GetDB()
    var requestData struct {
        Sessions []models.Session `json:"sessions"`
    }
    
    if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
        log.Printf("Error decoding session data: %v", err)
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request data"})
        return
    }
    
    log.Printf("Attempting to create %d sessions", len(requestData.Sessions))
    
    if err := models.BulkCreateSessions(db, requestData.Sessions); err != nil {
        log.Printf("Error creating sessions: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Session creation failed"})
        return
    }
    
    log.Println("Sessions created successfully")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{"message": "Sessions created successfully"})
}

