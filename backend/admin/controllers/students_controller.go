package controllers

import (
	"encoding/json"
	"net/http"
)

type StudentProgress struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Department   string `json:"department"`
	CurrentLevel int    `json:"current_level"`
	Attempts     int    `json:"attempts"`
	Qualified    bool   `json:"qualified"`
}

func GetStudentProgress(w http.ResponseWriter, r *http.Request) {
	// Sample data - replace with DB query
	students := []StudentProgress{
		{
			ID:           "stu1",
			Name:         "John Doe",
			Department:   "CS",
			CurrentLevel: 2,
			Attempts:     3,
			Qualified:    true,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(students)
}