// backend/admin/controllers/qr_controller.go
package controllers

import (
	// "database/sql"
	"encoding/json"
	qr "gd/admin/utils"
	"gd/database"
	"net/http"
	"time"
)

func GenerateQR(w http.ResponseWriter, r *http.Request) {
    venueID := r.URL.Query().Get("venue_id")
    if venueID == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "venue_id parameter is required"})
        return
    }

    // First deactivate any existing active QR codes for this venue
    _, err := database.GetDB().Exec(
        "UPDATE venue_qr_codes SET is_active = FALSE WHERE venue_id = ? AND is_active = TRUE",
        venueID,
    )
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "failed to deactivate old QR codes"})
        return
    }

    // Generate new QR with 15-minute expiry
    expiry := time.Now().Add(15 * time.Minute)
    qrData, err := qr.GenerateSecureQR(venueID, 15*time.Minute)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "failed to generate QR code"})
        return
    }

    // Store the new QR code in database
    _, err = database.GetDB().Exec(
        "INSERT INTO venue_qr_codes (id, venue_id, qr_data, expires_at) VALUES (UUID(), ?, ?, ?)",
        venueID, qrData, expiry,
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
        "expires_at": expiry.Format(time.RFC3339),
    })
}

func CleanupExpiredQRCodes() error {
    _, err := database.GetDB().Exec(
        "UPDATE venue_qr_codes SET is_active = FALSE WHERE expires_at < NOW() AND is_active = TRUE",
    )
    return err
}

// package controllers

// import (
// 	"encoding/json"
// 	qr "gd/admin/utils"
// 	"net/http"
// 	"time"
// 	// "github.com/skip2/go-qrcode"
// )

// func GenerateQR(w http.ResponseWriter, r *http.Request) {
//     // Get venue_id from query params
//     venueID := r.URL.Query().Get("venue_id")
//     if venueID == "" {
//         w.WriteHeader(http.StatusBadRequest)
//         json.NewEncoder(w).Encode(map[string]string{
//             "error": "venue_id parameter is required",
//         })
//         return
//     }

//     // Generate QR with 15-minute expiry (matches frontend expectation)
//     qrData, err := qr.GenerateSecureQR(venueID, 15*time.Minute)
//     if err != nil {
//         w.WriteHeader(http.StatusInternalServerError)
//         json.NewEncoder(w).Encode(map[string]string{
//             "error": "failed to generate QR code",
//         })
//         return
//     }

//     // Return consistent JSON response
//     w.Header().Set("Content-Type", "application/json")
//     json.NewEncoder(w).Encode(map[string]interface{}{
//         "success":    true,
//         "qr_string":  qrData,
//         "expires_in": 15, // minutes
//     })
// }