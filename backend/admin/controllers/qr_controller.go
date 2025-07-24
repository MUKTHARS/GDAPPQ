// backend/admin/controllers/qr_controller.go
package controllers

import (
	// "database/sql"
	"encoding/json"
	qr "gd/admin/utils"
	"gd/database"
	// "log"
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
        AND expires_at > NOW()
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
    expiresAt := time.Now().Add(15 * time.Minute) // Local time (IST)
    qrData, err := qr.GenerateSecureQR(venueID, 15*time.Minute)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "failed to generate QR code"})
        return
    }

    // Store the new QR code in database using MySQL's NOW() + INTERVAL for correct timezone handling
    _, err = database.GetDB().Exec(`
        INSERT INTO venue_qr_codes 
        (id, venue_id, qr_data, expires_at, is_active) 
        VALUES (?, ?, ?, NOW() + INTERVAL 15 MINUTE, TRUE)`,
        uuid.New().String(),
        venueID,
        qrData,
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

func CleanupExpiredQRCodes() error {
    _, err := database.GetDB().Exec(
        "UPDATE venue_qr_codes SET is_active = FALSE WHERE expires_at < UTC_TIMESTAMP() AND is_active = TRUE",
    )
    return err
}