package database

import "database/sql"

// DB is the global database connection
var DB *sql.DB

// SetDB sets the global database connection
func SetDB(database *sql.DB) {
    DB = database
}

// GetDB returns the global database connection
func GetDB() *sql.DB {
    return DB
}