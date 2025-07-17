package controllers

import (
	// "database/sql"
	"encoding/json"
	"gd/admin/models"
	qr "gd/admin/utils"
	"gd/database"
	"log"
	"net/http"
	"time"

	// "strings"

	"github.com/google/uuid"
)

// var db *sql.DB // Make sure this is properly initialized in main.go
// func SetDB(database *sql.DB) {
//     db = database
// }
func GetVenues(w http.ResponseWriter, r *http.Request) {
	// Ensure db connection is available
	db := database.GetDB()
	if db == nil {
		log.Println("Database connection is nil")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database connection error"})
		return
	}

	rows, err := db.Query("SELECT id, name, capacity FROM venues WHERE is_active = TRUE")
	if err != nil {
		log.Printf("Error fetching venues: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch venues"})
		return
	}
	defer rows.Close()

	var venues []models.Venue
	for rows.Next() {
		var v models.Venue
		if err := rows.Scan(&v.ID, &v.Name, &v.Capacity); err != nil {
			log.Printf("Error scanning venue: %v", err)
			continue
		}
		venues = append(venues, v)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(venues)
}

func UpdateVenue(w http.ResponseWriter, r *http.Request) {
    db := database.GetDB()
    if db == nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database connection error"})
        return
    }

    // Parse the request body to get the venue ID and other fields
    var requestBody struct {
        ID       string `json:"id"`
        Name     string `json:"name"`
        Capacity int    `json:"capacity"`
    }
    
    if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request data"})
        return
    }

    if requestBody.ID == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Venue ID is required"})
        return
    }

    _, err := db.Exec(
        `UPDATE venues 
        SET name = ?, capacity = ? 
        WHERE id = ? AND is_active = TRUE`,
        requestBody.Name, requestBody.Capacity, requestBody.ID)
    
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update venue"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"message": "Venue updated successfully"})
}


func CreateVenue(w http.ResponseWriter, r *http.Request) {
    db := database.GetDB()
    if db == nil {
        log.Println("Database connection is nil")
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Database connection error"})
        return
    }

    var venue models.Venue
    if err := json.NewDecoder(r.Body).Decode(&venue); err != nil {
        log.Printf("Error decoding venue data: %v", err)
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request data"})
        return
    }

    // Generate a UUID if ID is not provided
    if venue.ID == "" {
        venue.ID = uuid.New().String() 
    }

    // Generate secure QR payload (modified part)
    qrData, err := qr.GenerateSecureQR(venue.ID, 5*time.Minute)
    if err != nil {
        log.Printf("Error generating QR secret: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to generate venue QR"})
        return
    }
    venue.QRSecret = qrData
    
    venue.IsActive = true
    venue.CreatedBy = "admin1"

    if err := models.CreateVenue(db, venue); err != nil {
        log.Printf("Error creating venue: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Venue creation failed: " + err.Error()})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(venue)
}

