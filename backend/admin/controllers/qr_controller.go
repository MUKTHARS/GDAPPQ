package controllers

import (
	"encoding/json"
	qr "gd/admin/utils"
	"net/http"
	"time"
	// "github.com/skip2/go-qrcode"
)

func GenerateQR(w http.ResponseWriter, r *http.Request) {
    // Get venue_id from query params
    venueID := r.URL.Query().Get("venue_id")
    if venueID == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{
            "error": "venue_id parameter is required",
        })
        return
    }

    // Generate QR with 15-minute expiry (matches frontend expectation)
    qrData, err := qr.GenerateSecureQR(venueID, 15*time.Minute)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{
            "error": "failed to generate QR code",
        })
        return
    }

    // Return consistent JSON response
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "success":    true,
        "qr_string":  qrData,
        "expires_in": 15, // minutes
    })
}