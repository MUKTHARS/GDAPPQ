package models

import (
	"database/sql"
	"time"
	
)

type Venue struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Capacity  int    `json:"capacity"`
	QRSecret  string `json:"qr_secret"`
	IsActive  bool   `json:"is_active"`
	CreatedBy string `json:"created_by"`
}

func CreateVenue(db *sql.DB, v Venue) error {
	_, err := db.Exec(
		`INSERT INTO venues 
		(id, name, capacity, qr_secret, is_active, created_by, created_at) 
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		v.ID, v.Name, v.Capacity, v.QRSecret, v.IsActive, v.CreatedBy, time.Now(),
	)
	return err
}