package controllers

import (
	"encoding/json"
	"net/http"
)

type Question struct {
	ID      string  `json:"id"`
	Text    string  `json:"text"`
	Weight  float64 `json:"weight"`
	Levels  []int   `json:"levels"`
}

func GetQuestions(w http.ResponseWriter, r *http.Request) {
	questions := []Question{
		{
			ID:     "q1",
			Text:   "Clarity of arguments",
			Weight: 1.5,
			Levels: []int{1, 2},
		},
	}
	json.NewEncoder(w).Encode(questions)
}