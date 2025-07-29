// backend/student/controllers/survey_calculations.go
package controllers

import (
	"database/sql"
	// "encoding/json"
	// "fmt"
	// "gd/database"
	"log"
	"math"
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

    // Calculate base scores
    scores := make(map[string]float64)
    penalties := make(map[string]int)
    biases := make(map[string]bool)

    // Initialize scores and penalties
    for _, p := range participants {
        scores[p] = 0.0
        penalties[p] = 0
        biases[p] = false
    }

    // Calculate base scores from rankings
    for _, resp := range responses {
        // Apply weights to base scores
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
    questionCount := make(map[int]int)
    for _, resp := range responses {
        questionCount[resp.Question]++
    }

    // Calculate average scores per question
    questionAverages := make(map[int]float64)
    for q, count := range questionCount {
        total := 0.0
        for _, resp := range responses {
            if resp.Question == q {
                if resp.FirstPlace != "" {
                    total += baseScore1st
                }
                if resp.SecondPlace != "" {
                    total += baseScore2nd
                }
                if resp.ThirdPlace != "" {
                    total += baseScore3rd
                }
            }
        }
        questionAverages[q] = total / float64(count)
    }

    // Check for penalties (deviation from average)
    for studentID := range scores {
        for q, avg := range questionAverages {
            var givenScore float64
            for _, resp := range responses {
                if resp.Question == q {
                    if resp.FirstPlace == studentID {
                        givenScore = baseScore1st
                    } else if resp.SecondPlace == studentID {
                        givenScore = baseScore2nd
                    } else if resp.ThirdPlace == studentID {
                        givenScore = baseScore3rd
                    }
                }
            }

            // Apply penalty if deviation is >= 2 points
            if math.Abs(givenScore-avg) >= 2.0 {
                penalties[studentID]++
            }
        }
    }

    // Check for bias (repeated patterns)
    for studentID := range scores {
        biasCount := 0
        for _, resp := range responses {
            if resp.FirstPlace == studentID || resp.SecondPlace == studentID || resp.ThirdPlace == studentID {
                biasCount++
            }
        }
        // Flag if consistently ranked (either high or low)
        if biasCount >= len(responses)/2 {
            biases[studentID] = true
        }
    }

    // Apply penalties and disqualifications
    qualifiedParticipants := make(map[string]float64)
    disqualifications := 0

    for studentID, score := range scores {
        // Apply penalties
        score -= float64(penalties[studentID])

        // Check for disqualification
        if penalties[studentID] > maxPenalty || biases[studentID] {
            disqualifications++
            continue
        }

        qualifiedParticipants[studentID] = score
    }

    // Check for session cancellation (more than 30% disqualified)
    if float64(disqualifications)/float64(len(participants)) > 0.3 {
        log.Println("Session cancelled due to too many disqualifications")
        return nil
    }

    // Determine top performers (top 2-3)
    topPerformers := make(map[string]float64)
    if len(qualifiedParticipants) > 0 {
        // Simple implementation - take top 2 scores
        var max1, max2 float64
        var top1, top2 string

        for id, score := range qualifiedParticipants {
            if score > max1 {
                max2 = max1
                top2 = top1
                max1 = score
                top1 = id
            } else if score > max2 {
                max2 = score
                top2 = id
            }
        }

        if top1 != "" {
            topPerformers[top1] = max1
        }
        if top2 != "" {
            topPerformers[top2] = max2
        }
    }

    // Store results
    for studentID, score := range topPerformers {
        _, err = tx.Exec(`
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

    // Initialize
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

    // Calculate averages per question
    questionStats := make(map[int]struct {
        count int
        total float64
    })

    for _, resp := range responses {
        stat := questionStats[resp.Question]
        if resp.FirstPlace != "" {
            stat.total += baseScore1st
            stat.count++
        }
        if resp.SecondPlace != "" {
            stat.total += baseScore2nd
            stat.count++
        }
        if resp.ThirdPlace != "" {
            stat.total += baseScore3rd
            stat.count++
        }
        questionStats[resp.Question] = stat
    }

    // Check for penalties
    for studentID := range scores {
        for q, stat := range questionStats {
            if stat.count == 0 {
                continue
            }
            avg := stat.total / float64(stat.count)

            // Find what this student gave others
            var givenScore float64
            for _, resp := range responses {
                if resp.Question == q {
                    if resp.FirstPlace == studentID {
                        givenScore = baseScore1st
                    } else if resp.SecondPlace == studentID {
                        givenScore = baseScore2nd
                    } else if resp.ThirdPlace == studentID {
                        givenScore = baseScore3rd
                    }
                }
            }

            // Apply penalty if deviation is >= 2
            if math.Abs(givenScore-avg) >= 2.0 {
                penalties[studentID]++
            }
        }
    }

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