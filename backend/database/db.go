package database

import (
	"database/sql"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

// Initialize handles all database setup
func Initialize() error {
	// Load .env file
	err := godotenv.Load("admin/.env")
	if err != nil {
		return err
	}

	// Get and parse database connection string
	dbURL := os.Getenv("DB_URL")
	dbURL = strings.TrimPrefix(dbURL, "mysql://")
	if dbURL == "" {
		log.Fatal("DB_URL not set in .env file")
	}

	// Create connection
	db, err := sql.Open("mysql", dbURL)
	if err != nil {
		return err
	}

	// Verify connection
	if err := db.Ping(); err != nil {
		return err
	}

	DB = db
	return InitDB(db)
}

// GetDB returns the global database connection
func GetDB() *sql.DB {
	return DB
}

// package database

// import "database/sql"

// // DB is the global database connection
// var DB *sql.DB

// // SetDB sets the global database connection
// func SetDB(database *sql.DB) {
//     DB = database
// }

// // GetDB returns the global database connection
// func GetDB() *sql.DB {
//     return DB
// }