// backend/admin/controllers/qr_controller.go
package controllers

import (
	// "database/sql"
	"encoding/json"
	qr "gd/admin/utils"
	"gd/database"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
)
func GenerateQR(w http.ResponseWriter, r *http.Request) {
    venueID := r.URL.Query().Get("venue_id")
    if venueID == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "venue_id parameter is required"})
        return
    }

    // First check if there's already an active QR code for this venue
    var existingQR struct {
        QRData    string
        ExpiresAt time.Time
    }
    
    err := database.GetDB().QueryRow(`
        SELECT qr_data, expires_at 
        FROM venue_qr_codes 
        WHERE venue_id = ? AND is_active = TRUE 
        AND expires_at > CONVERT_TZ(NOW(), @@session.time_zone, '+00:00')
        ORDER BY created_at DESC LIMIT 1`,
        venueID,
    ).Scan(&existingQR.QRData, &existingQR.ExpiresAt)

    if err == nil {
        // Found existing active QR code - return it
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{
            "success":    true,
            "qr_string":  existingQR.QRData,
            "expires_in": time.Until(existingQR.ExpiresAt).Minutes(),
            "expires_at": existingQR.ExpiresAt.Format(time.RFC3339),
        })
        return
    }

    // No active QR found - proceed with generating a new one
    expiresAt := time.Now().Add(15 * time.Minute)
    expiresAtStr := expiresAt.Format("2006-01-02 15:04:05")
    qrData, err := qr.GenerateSecureQR(venueID, 15*time.Minute)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "failed to generate QR code"})
        return
    }
    log.Printf("Local time: %v", time.Now())
log.Printf("Expires at (local): %v", expiresAt)
    // Store the new QR code in database
    _, err = database.GetDB().Exec(`
        INSERT INTO venue_qr_codes 
        (id, venue_id, qr_data, expires_at, is_active) 
        VALUES (?, ?, ?, CONVERT_TZ(?, '+00:00', @@session.time_zone), TRUE)`,
        uuid.New().String(),
        venueID,
        qrData,
        expiresAtStr,
    )
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "failed to store QR code"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "success":    true,
        "qr_string":  qrData,
        "expires_in": 15,
        "expires_at": expiresAt.Format(time.RFC3339),
    })
}

// func GenerateQR(w http.ResponseWriter, r *http.Request) {
//     venueID := r.URL.Query().Get("venue_id")
//     if venueID == "" {
//         w.WriteHeader(http.StatusBadRequest)
//         json.NewEncoder(w).Encode(map[string]string{"error": "venue_id parameter is required"})
//         return
//     }

//     // First deactivate any existing active QR codes for this venue
//     _, err := database.GetDB().Exec(
//         "UPDATE venue_qr_codes SET is_active = FALSE WHERE venue_id = ? AND is_active = TRUE",
//         venueID,
//     )
//     if err != nil {
//         w.WriteHeader(http.StatusInternalServerError)
//         json.NewEncoder(w).Encode(map[string]string{"error": "failed to deactivate old QR codes"})
//         return
//     }

//     // Generate new QR with 15-minute expiry
    
//     expiresAt := time.Now().Add(15 * time.Minute)
//     // expiry := time.Now().Add(15 * time.Minute).UTC()
//     expiresAtStr := expiresAt.Format("2006-01-02 15:04:05")
//     qrData, err := qr.GenerateSecureQR(venueID, 15*time.Minute)
//     log.Printf("Local time: %v", time.Now())
// log.Printf("Expires at (local): %v", expiresAt)
// log.Printf("MySQL NOW(): %v", database.GetDB().QueryRow("SELECT NOW()"))
//     if err != nil {
//         w.WriteHeader(http.StatusInternalServerError)
//         json.NewEncoder(w).Encode(map[string]string{"error": "failed to generate QR code"})
//         return
//     }

//     // Store the new QR code in database
//     _, err = database.GetDB().Exec(`
//     INSERT INTO venue_qr_codes 
//     (id, venue_id, qr_data, expires_at, is_active) 
//     VALUES (?, ?, ?, CONVERT_TZ(?, '+00:00', @@session.time_zone), TRUE)`,
//     uuid.New().String(),
//     venueID,
//     qrData,
//     expiresAtStr,
// )
//     if err != nil {
//         w.WriteHeader(http.StatusInternalServerError)
//         json.NewEncoder(w).Encode(map[string]string{"error": "failed to store QR code"})
//         return
//     }

//     w.Header().Set("Content-Type", "application/json")
//     json.NewEncoder(w).Encode(map[string]interface{}{
//         "success":    true,
//         "qr_string":  qrData,
//         "expires_in": 15,
//         "expires_at": expiresAt.Format(time.RFC3339),
//     })
// }

func CleanupExpiredQRCodes() error {
    _, err := database.GetDB().Exec(
        "UPDATE venue_qr_codes SET is_active = FALSE WHERE expires_at < NOW() AND is_active = TRUE",
    )
    return err
}

