package jwt

import (
	// "log"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var secret = []byte(os.Getenv("JWT_SECRET_STUDENT"))

type StudentClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	Level  int    `json:"level"`
	jwt.RegisteredClaims
}


func GenerateStudentToken(id string, level int) (string, error) {
	claims := &StudentClaims{
		UserID: id,
		Role:   "student",
		Level:  level,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

func VerifyStudentToken(tokenString string) (*StudentClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &StudentClaims{}, func(t *jwt.Token) (interface{}, error) {
		return secret, nil
	})
	
	if err != nil {
		return nil, err
	}
	
	if claims, ok := token.Claims.(*StudentClaims); ok && token.Valid {
		return claims, nil
	}
	
	return nil, jwt.ErrInvalidKey
}


// func GenerateStudentToken(id string, level int) (string, error) {
// 	claims := &StudentClaims{
// 		UserID: id,
// 		Role:   "student",
// 		Level:  level,
// 		RegisteredClaims: jwt.RegisteredClaims{
// 			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
// 		},
// 	}

// 	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
// 	return token.SignedString(secret)
// }

// func VerifyStudentToken(tokenString string) (*StudentClaims, error) {
// 	token, err := jwt.ParseWithClaims(tokenString, &StudentClaims{}, func(t *jwt.Token) (interface{}, error) {
// 		return secret, nil
// 	})
	
// 	if err != nil {
// 		log.Printf("JWT verification error: %v", err)
// 		return nil, err
// 	}
	
// 	if claims, ok := token.Claims.(*StudentClaims); ok && token.Valid {
// 		return claims, nil
// 	}
	
// 	return nil, jwt.ErrInvalidKey
// }

// package jwt

// import (
// 	// "log"
// 	"log"
// 	"os"
// 	"strings"
// 	"time"

// 	"github.com/golang-jwt/jwt/v5"
// )

// var secret = []byte(os.Getenv("JWT_SECRET_STUDENT")) 
// func init() {
//     if len(secret) == 0 {
//         secret = []byte("password123") // Fallback for development
//         log.Println("WARNING: Using default JWT secret - configure JWT_SECRET_STUDENT for production")
//     }
// }
// type StudentClaims struct {
// 	UserID string `json:"user_id"`
// 	Role   string `json:"role"`
// 	Level  int    `json:"level"`
// 	jwt.RegisteredClaims
// }

// func GenerateStudentToken(id string, level int) (string, error) {
// 	claims := StudentClaims{
// 		UserID: id,
// 		Role:   "student",
// 		Level:  level,
// 		RegisteredClaims: jwt.RegisteredClaims{
// 			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
// 		},
// 	}
// 	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
// 	return token.SignedString(secret)
// }

// func VerifyStudentToken(tokenString string) (*StudentClaims, error) {
//     if tokenString == "" {
//         log.Println("Empty token string received")
//         return nil, jwt.ErrInvalidKey
//     }

//     // Remove "Bearer " prefix if present
//     if len(tokenString) > 7 && strings.ToUpper(tokenString[0:7]) == "BEARER " {
//         tokenString = tokenString[7:]
//     }

//     log.Printf("Verifying token: %s", tokenString) // Debug log
    
//     token, err := jwt.ParseWithClaims(tokenString, &StudentClaims{}, func(t *jwt.Token) (interface{}, error) {
//         return secret, nil
//     })
    
//     if err != nil {
//         log.Printf("Token verification error: %v", err)
//         return nil, err
//     }
    
//     if claims, ok := token.Claims.(*StudentClaims); ok && token.Valid {
//         log.Printf("Token valid for user: %s", claims.UserID)
//         return claims, nil
//     }
    
//     log.Println("Invalid token claims")
//     return nil, jwt.ErrInvalidKey
// }
