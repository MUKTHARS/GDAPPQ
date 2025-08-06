package controllers

import (
	// "database/sql"
	"encoding/json"
	"gd/database"
	"log"
	"net/http"
)

type BookingInfo struct {
	StudentID    string `json:"student_id"`
	StudentName  string `json:"student_name"`
	VenueID      string `json:"venue_id"`
	VenueName    string `json:"venue_name"`
	SessionID    string `json:"session_id"`
	SessionLevel int    `json:"session_level"`
	BookedAt     string `json:"booked_at"`
}

func GetStudentBookings(w http.ResponseWriter, r *http.Request) {
    rows, err := database.GetDB().Query(`
        SELECT 
            su.id as student_id,
            su.full_name as student_name,
            v.id as venue_id,
            v.name as venue_name,
            s.id as session_id,
            s.level as session_level,
            sp.joined_at as booked_at
        FROM session_participants sp
        JOIN student_users su ON sp.student_id = su.id
        JOIN gd_sessions s ON sp.session_id = s.id
        JOIN venues v ON s.venue_id = v.id
        WHERE s.status = 'pending' AND sp.is_dummy = FALSE
        ORDER BY sp.joined_at DESC
    `)
    
    if err != nil {
        log.Printf("Database error: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode([]BookingInfo{}) // Return empty array instead of error message
        return
    }
    defer rows.Close()

    var bookings []BookingInfo
    for rows.Next() {
        var booking BookingInfo
        if err := rows.Scan(
            &booking.StudentID,
            &booking.StudentName,
            &booking.VenueID,
            &booking.VenueName,
            &booking.SessionID,
            &booking.SessionLevel,
            &booking.BookedAt,
        ); err != nil {
            log.Printf("Error scanning booking row: %v", err)
            continue
        }
        bookings = append(bookings, booking)
    }

    // Ensure we always return an array, even if empty
    if bookings == nil {
        bookings = []BookingInfo{}
    }

    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(bookings); err != nil {
        log.Printf("Error encoding bookings: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode([]BookingInfo{}) // Fallback to empty array
    }
}



// func GetStudentBookings(w http.ResponseWriter, r *http.Request) {
// 	rows, err := database.GetDB().Query(`
// 		SELECT 
// 			su.id as student_id,
// 			su.full_name as student_name,
// 			v.id as venue_id,
// 			v.name as venue_name,
// 			s.id as session_id,
// 			s.level as session_level,
// 			sp.created_at as booked_at
// 		FROM session_participants sp
// 		JOIN student_users su ON sp.student_id = su.id
// 		JOIN gd_sessions s ON sp.session_id = s.id
// 		JOIN venues v ON s.venue_id = v.id
// 		WHERE s.status = 'pending'
// 		ORDER BY sp.created_at DESC
// 	`)
	
// 	if err != nil {
// 		log.Printf("Database error: %v", err)
// 		w.WriteHeader(http.StatusInternalServerError)
// 		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
// 		return
// 	}
// 	defer rows.Close()

// 	var bookings []BookingInfo
// 	for rows.Next() {
// 		var booking BookingInfo
// 		if err := rows.Scan(
// 			&booking.StudentID,
// 			&booking.StudentName,
// 			&booking.VenueID,
// 			&booking.VenueName,
// 			&booking.SessionID,
// 			&booking.SessionLevel,
// 			&booking.BookedAt,
// 		); err != nil {
// 			log.Printf("Error scanning booking row: %v", err)
// 			continue
// 		}
// 		bookings = append(bookings, booking)
// 	}

// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(bookings)
// }