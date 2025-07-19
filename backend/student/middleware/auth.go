package middleware

import (
	"context"
	"net/http"
	"gd/student/utils"
)

func StudentOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		claims, err := jwt.VerifyStudentToken(token)
		if err != nil || claims.Role != "student" {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		
		ctx := context.WithValue(r.Context(), "studentID", claims.UserID)
		ctx = context.WithValue(ctx, "studentLevel", claims.Level)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}