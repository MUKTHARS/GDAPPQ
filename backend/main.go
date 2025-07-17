package main

import (
	"database/sql"
	"fmt"
	"gd/database"
	"gd/admin/routes"
	// "gd/admin/controllers"
	"log"
	"net/http"

	_ "github.com/go-sql-driver/mysql"
)

var db *sql.DB

func main() {
	
	var err error
	db, err = sql.Open("mysql", "root:1234@tcp(localhost:3306)/gd_admin")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err := initDB(db); err != nil {
		log.Fatal("Database initialization failed:", err)
	}
if err := db.Ping(); err != nil {
    log.Fatal("Database connection failed:", err)
}
database.SetDB(db)
	adminRouter := routes.SetupAdminRoutes()
	http.Handle("/admin/", enableCORS(adminRouter))
	http.Handle("/", enableCORS(adminRouter))
	
	log.Println("Server starting on :8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next.ServeHTTP(w, r)
	})
}


func SetDB(database *sql.DB) {
    db = database
}

func initDB(db *sql.DB) error {
    // Create tables if not exists (with IF NOT EXISTS)
    createTables := []string{
        // Admin tables
        `CREATE TABLE IF NOT EXISTS admin_users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        // Staff tables
        `CREATE TABLE IF NOT EXISTS staff_users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            admin_id VARCHAR(36),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
        )`,

        // Student tables
        `CREATE TABLE IF NOT EXISTS student_users (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            department VARCHAR(50) NOT NULL,
            year INT NOT NULL,
            photo_url VARCHAR(255),
            current_gd_level INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        // Venue tables
        `CREATE TABLE IF NOT EXISTS venues (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            capacity INT DEFAULT 10,
            qr_secret VARCHAR(100) NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_by VARCHAR(36),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
        )`,

        // Session tables
        `CREATE TABLE IF NOT EXISTS gd_sessions (
            id VARCHAR(36) PRIMARY KEY,
            venue_id VARCHAR(36),
            level INT NOT NULL,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP NOT NULL,
            agenda JSON NOT NULL,
            survey_weights JSON NOT NULL,
            max_capacity INT DEFAULT 10,
            status ENUM('pending','active','completed','cancelled') DEFAULT 'pending',
            created_by VARCHAR(36),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
        )`,

        // Participant tables
        `CREATE TABLE IF NOT EXISTS session_participants (
            session_id VARCHAR(36),
            student_id VARCHAR(36),
            is_dummy BOOLEAN DEFAULT FALSE,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (session_id, student_id),
            FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES student_users(id) ON DELETE CASCADE
        )`,

        // Survey tables
        `CREATE TABLE IF NOT EXISTS survey_responses (
            id VARCHAR(36) PRIMARY KEY,
            session_id VARCHAR(36),
            responder_id VARCHAR(36),
            question_number INT NOT NULL,
            first_place VARCHAR(36),
            second_place VARCHAR(36),
            third_place VARCHAR(36),
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (responder_id) REFERENCES student_users(id) ON DELETE CASCADE,
            FOREIGN KEY (first_place) REFERENCES student_users(id) ON DELETE SET NULL,
            FOREIGN KEY (second_place) REFERENCES student_users(id) ON DELETE SET NULL,
            FOREIGN KEY (third_place) REFERENCES student_users(id) ON DELETE SET NULL
        )`,

        // Results tables
        `CREATE TABLE IF NOT EXISTS qualifications (
            session_id VARCHAR(36),
            student_id VARCHAR(36),
            final_score DECIMAL(5,2) NOT NULL,
            qualified_for_level INT NOT NULL,
            is_approved BOOLEAN DEFAULT FALSE,
            approved_by VARCHAR(36),
            approved_at TIMESTAMP,
            PRIMARY KEY (session_id, student_id),
            FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES student_users(id) ON DELETE CASCADE,
            FOREIGN KEY (approved_by) REFERENCES staff_users(id) ON DELETE SET NULL
        )`,
    }

    for _, query := range createTables {
        if _, err := db.Exec(query); err != nil {
            return fmt.Errorf("error creating tables: %v", err)
        }
    }

    // Insert sample data with IGNORE to skip existing records
    sampleData := []string{
        // Admin user
        `INSERT IGNORE INTO admin_users (id, email, password_hash) VALUES 
        ('admin1', 'admin@example.com', '$2a$10$xJwL5v5Jz5TZfN5D5M7zOeJz5TZfN5D5M7zOeJz5TZfN5D5M7zOe')`,

        // Staff user
        `INSERT IGNORE INTO staff_users (id, email, password_hash, admin_id) VALUES 
        ('staff1', 'staff@example.com', '$2a$10$xJwL5v5Jz5TZfN5D5M7zOeJz5TZfN5D5M7zOeJz5TZfN5D5M7zOe', 'admin1')`,

        // Students
        `INSERT IGNORE INTO student_users (id, email, password_hash, full_name, department, year) VALUES 
        ('student1', 'student1@example.com', '$2a$10$xJwL5v5Jz5TZfN5D5M7zOeJz5TZfN5D5M7zOeJz5TZfN5D5M7zOe', 'John Doe', 'CS', 3),
        ('student2', 'student2@example.com', '$2a$10$xJwL5v5Jz5TZfN5D5M7zOeJz5TZfN5D5M7zOeJz5TZfN5D5M7zOe', 'Jane Smith', 'ECE', 2)`,

        // Venues
        `INSERT IGNORE INTO venues (id, name, capacity, qr_secret, created_by) VALUES 
        ('venue1', 'Table 1-A', 10, 'venue1_secret123', 'admin1'),
        ('venue2', 'Room 3B', 15, 'venue2_secret456', 'admin1')`,

        // Sessions
        `INSERT IGNORE INTO gd_sessions (id, venue_id, level, start_time, end_time, agenda, survey_weights, created_by) VALUES 
        ('session1', 'venue1', 1, 
         DATE_ADD(NOW(), INTERVAL 1 DAY), 
         DATE_ADD(NOW(), INTERVAL 1 DAY) + INTERVAL 30 MINUTE,
         '{"prep_time": 5, "discussion": 20, "survey": 5}',
         '{"question1": 1.5, "question2": 1.0, "question3": 1.2}',
         'admin1')`,

        // Participants
        `INSERT IGNORE INTO session_participants (session_id, student_id) VALUES 
        ('session1', 'student1'),
        ('session1', 'student2')`,
    }

    for _, query := range sampleData {
        if _, err := db.Exec(query); err != nil {
            log.Printf("Warning: inserting sample data: %v (this might be expected if data already exists)", err)
        }
    }

    log.Println("Database initialization completed successfully!")
    return nil
}