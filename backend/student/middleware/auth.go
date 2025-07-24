package middleware

import (
	"context"
	"encoding/json"
	"gd/student/utils"
	// "log"
	"net/http"
	"strings"
)

func StudentOnly(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        authHeader := r.Header.Get("Authorization")
        if authHeader == "" {
            w.WriteHeader(http.StatusUnauthorized)
            json.NewEncoder(w).Encode(map[string]string{"error": "Authorization header required"})
            return
        }

        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        if tokenString == authHeader {
            w.WriteHeader(http.StatusUnauthorized)
            json.NewEncoder(w).Encode(map[string]string{"error": "Bearer token required"})
            return
        }

        claims, err := jwt.VerifyStudentToken(tokenString)
        if err != nil {
            w.WriteHeader(http.StatusForbidden)
            json.NewEncoder(w).Encode(map[string]string{"error": "Invalid token", "details": err.Error()})
            return
        }

        if claims.Role != "student" {
            w.WriteHeader(http.StatusForbidden)
            json.NewEncoder(w).Encode(map[string]string{"error": "Insufficient privileges"})
            return
        }

        ctx := context.WithValue(r.Context(), "studentID", claims.UserID)
        ctx = context.WithValue(ctx, "studentLevel", claims.Level)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
