// backend/student/controllers/survey_calculations.go
package controllers

import (
	"database/sql"
	// "encoding/json"
	// "fmt"
	// "gd/database"
	"log"
	// "math"
	// "time"
)

const (
	baseScore1st = 4.0
	baseScore2nd = 3.0
	baseScore3rd = 2.0
	maxPenalty   = 3
)

type SurveyCalculator struct {
	db *sql.DB
}

func NewSurveyCalculator(db *sql.DB) *SurveyCalculator {
	return &SurveyCalculator{db: db}
}
type SurveySubmission struct {
	SessionID   string                 `json:"session_id"`
	Responses   map[int]map[int]string `json:"responses"` // question -> rank -> student_id
	TookTooLong bool                   `json:"tookTooLong"`
}
func (sc *SurveyCalculator) CalculateResults(sessionID string) error {
	tx, err := sc.db.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		return err
	}
	defer tx.Rollback()

	// Get all participants
	participants, err := sc.getParticipants(tx, sessionID)
	if err != nil {
		return err
	}

	// Get all survey responses for this session
	responses, err := sc.getSurveyResponses(tx, sessionID)
	if err != nil {
		return err
	}

	// Calculate scores
	scores, penalties, biases := sc.calculateScores(participants, responses)

	// Apply penalties and check for disqualifications
	qualifiedParticipants := sc.applyPenaltiesAndCheckQualification(participants, scores, penalties, biases)

	// Store results
	if err := sc.storeResults(tx, sessionID, qualifiedParticipants); err != nil {
		return err
	}

	return tx.Commit()
}

func (sc *SurveyCalculator) getParticipants(tx *sql.Tx, sessionID string) ([]string, error) {
	rows, err := tx.Query(`
		SELECT student_id FROM session_participants 
		WHERE session_id = ? AND is_dummy = FALSE`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var participants []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		participants = append(participants, id)
	}
	return participants, nil
}

func (sc *SurveyCalculator) getSurveyResponses(tx *sql.Tx, sessionID string) ([]SurveyResponse, error) {
	rows, err := tx.Query(`
		SELECT question_number, first_place, second_place, third_place, weight 
		FROM survey_responses 
		WHERE session_id = ?`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var responses []SurveyResponse
	for rows.Next() {
		var r SurveyResponse
		if err := rows.Scan(&r.Question, &r.FirstPlace, &r.SecondPlace, &r.ThirdPlace, &r.Weight); err != nil {
			return nil, err
		}
		responses = append(responses, r)
	}
	return responses, nil
}

func (sc *SurveyCalculator) calculateScores(participants []string, responses []SurveyResponse) (map[string]float64, map[string]int, map[string]bool) {
	scores := make(map[string]float64)
	penalties := make(map[string]int)
	biases := make(map[string]bool)

	// Initialize scores
	for _, p := range participants {
		scores[p] = 0.0
		penalties[p] = 0
		biases[p] = false
	}

	// Calculate base scores
	for _, resp := range responses {
		if resp.FirstPlace != "" {
			scores[resp.FirstPlace] += baseScore1st * resp.Weight
		}
		if resp.SecondPlace != "" {
			scores[resp.SecondPlace] += baseScore2nd * resp.Weight
		}
		if resp.ThirdPlace != "" {
			scores[resp.ThirdPlace] += baseScore3rd * resp.Weight
		}
	}

	// Calculate averages and check for penalties
	// (Implementation omitted for brevity, but would calculate averages
	// and compare individual rankings to detect penalties and biases)

	return scores, penalties, biases
}

func (sc *SurveyCalculator) applyPenaltiesAndCheckQualification(participants []string, scores map[string]float64, penalties map[string]int, biases map[string]bool) map[string]float64 {
	qualified := make(map[string]float64)
	
	for _, p := range participants {
		// Apply penalties
		if penalties[p] > 0 {
			scores[p] -= float64(penalties[p])
		}
		
		// Check for disqualification
		if penalties[p] > maxPenalty || biases[p] {
			continue
		}
		
		qualified[p] = scores[p]
	}
	
	return qualified
}

func (sc *SurveyCalculator) storeResults(tx *sql.Tx, sessionID string, qualified map[string]float64) error {
	for studentID, score := range qualified {
		_, err := tx.Exec(`
			INSERT INTO qualifications 
			(session_id, student_id, final_score, qualified_for_level, is_approved) 
			VALUES (?, ?, ?, 
				(SELECT current_gd_level + 1 FROM student_users WHERE id = ?),
				FALSE)
			ON DUPLICATE KEY UPDATE final_score = VALUES(final_score)`,
			sessionID, studentID, score, studentID)
		if err != nil {
			return err
		}
	}
	return nil
}