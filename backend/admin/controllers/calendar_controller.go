package controllers

import (
	"encoding/json"
	"net/http"
	"time"
)

type SessionSlot struct {
	ID        string    `json:"id"`
	Venue     string    `json:"venue"`
	Level     int       `json:"level"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
	Status    string    `json:"status"`
}

func GetSessionCalendar(w http.ResponseWriter, r *http.Request) {
	// Sample data - replace with DB query
	sessions := []SessionSlot{
		{
			ID:        "sess1",
			Venue:     "Table 1-A",
			Level:     1,
			StartTime: time.Now().Add(2 * time.Hour),
			EndTime:   time.Now().Add(3 * time.Hour),
			Status:    "pending",
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sessions)
}