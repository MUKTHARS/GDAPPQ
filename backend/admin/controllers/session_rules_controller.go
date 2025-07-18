package controllers

import (
	"encoding/json"
	"net/http"
)

type RuleConfig struct {
	Level              int     `json:"level"`
	PrepTime           int     `json:"prep_time"`
	DiscussionTime     int     `json:"discussion_time"`
	PenaltyThreshold   float64 `json:"penalty_threshold"`
	BiasDetectionLimit int     `json:"bias_detection_limit"`
}

func UpdateSessionRules(w http.ResponseWriter, r *http.Request) {
	var config RuleConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// TODO: Implement DB update logic
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(config)
}