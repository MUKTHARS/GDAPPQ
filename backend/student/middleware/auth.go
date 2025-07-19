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



// func StudentOnly(next http.Handler) http.Handler {
//     return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
//         authHeader := r.Header.Get("Authorization")
//         log.Printf("Received auth header: %s", authHeader)
        
//         if authHeader == "" {
//             log.Println("No authorization header provided")
//             w.WriteHeader(http.StatusUnauthorized)
//             return
//         }

//         tokenString := strings.TrimPrefix(authHeader, "Bearer ")
//         tokenString = strings.TrimSpace(tokenString)
//         log.Printf("Token string after cleanup: %s", tokenString)

//         claims, err := jwt.VerifyStudentToken(tokenString)
//         if err != nil {
//             log.Printf("Token verification failed: %v", err)
//             w.WriteHeader(http.StatusForbidden)
//             return
//         }

//         if claims.Role != "student" {
//             log.Printf("Invalid role: %s", claims.Role)
//             w.WriteHeader(http.StatusForbidden)
//             return
//         }

//         log.Printf("Authenticated student: %s, level: %d", claims.UserID, claims.Level)
//         ctx := context.WithValue(r.Context(), "studentID", claims.UserID)
//         ctx = context.WithValue(ctx, "studentLevel", claims.Level)
//         next.ServeHTTP(w, r.WithContext(ctx))
//     })
// }
