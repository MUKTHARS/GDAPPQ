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

    // Check if force_new parameter is set
    forceNew := r.URL.Query().Get("force_new") == "true"

    // If not forcing new, check for existing active QR code
    if !forceNew {
        var existingQR struct {
            ID        string
            QRData    string
            ExpiresAt time.Time
        }
        
        err := database.GetDB().QueryRow(`
            SELECT id, qr_data, expires_at 
            FROM venue_qr_codes 
            WHERE venue_id = ? AND is_active = TRUE 
            AND expires_at > NOW()
            ORDER BY created_at DESC LIMIT 1`,
            venueID,
        ).Scan(&existingQR.ID, &existingQR.QRData, &existingQR.ExpiresAt)

        if err == nil {
            // Found existing active QR code - return it
            w.Header().Set("Content-Type", "application/json")
            json.NewEncoder(w).Encode(map[string]interface{}{
                "success":    true,
                "qr_string":  existingQR.QRData,
                "expires_in": time.Until(existingQR.ExpiresAt).Minutes(),
                "expires_at": existingQR.ExpiresAt.Format(time.RFC3339),
                "qr_id":      existingQR.ID, 
            })
            return
        }
    }

    // Generate new QR code
    expiresAt := time.Now().Add(240 * time.Minute)
    qrData, err := qr.GenerateSecureQR(venueID, 2400*time.Minute)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "failed to generate QR code"})
        return
    }

    // Deactivate any existing active QR codes for this venue
    _, err = database.GetDB().Exec(`
        UPDATE venue_qr_codes 
        SET is_active = FALSE 
        WHERE venue_id = ? AND is_active = TRUE`,
        venueID)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "failed to deactivate existing QR codes"})
        return
    }

    // Store the new QR code
    qrID := uuid.New().String()
    _, err = database.GetDB().Exec(`
        INSERT INTO venue_qr_codes 
        (id, venue_id, qr_data, expires_at, is_active) 
        VALUES (?, ?, ?, NOW() + INTERVAL 240 MINUTE, TRUE)`,
        qrID,
        venueID,
        qrData)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "failed to store QR code"})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "success":    true,
        "qr_string":  qrData,
        "expires_in":240,
        "expires_at": expiresAt.Format(time.RFC3339),
        "qr_id":      qrID,
    })
}
func CleanupExpiredQRCodes() error {
    _, err := database.GetDB().Exec(
        "UPDATE venue_qr_codes SET is_active = FALSE WHERE expires_at < UTC_TIMESTAMP() AND is_active = TRUE",
    )
    return err
}