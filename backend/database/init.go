package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func InitDB(db *sql.DB) error {
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
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        // Venue tables
        `CREATE TABLE IF NOT EXISTS venues (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            capacity INT DEFAULT 10,
            level INT DEFAULT '0',
            qr_secret VARCHAR(255) NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            session_timing VARCHAR(50) NOT NULL,
            table_details VARCHAR(50) NOT NULL,
            created_by VARCHAR(36),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
        )`,

        // Session tables
        `CREATE TABLE IF NOT EXISTS gd_sessions (
            id VARCHAR(36) PRIMARY KEY,
            topic TEXT NOT NULL,
            venue_id VARCHAR(36),
            level INT NOT NULL,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP NOT NULL,
            agenda JSON DEFAULT (JSON_OBJECT()),
            survey_weights JSON DEFAULT (JSON_OBJECT()),
            max_capacity INT DEFAULT 10,
            status ENUM('pending','active','completed','cancelled') DEFAULT 'pending',
            created_by VARCHAR(36),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
        )`,

        // Participant tables
        `CREATE TABLE IF NOT EXISTS session_participants (
            id VARCHAR(36) PRIMARY KEY,
            session_id VARCHAR(36),
            student_id VARCHAR(36),
            is_dummy BOOLEAN DEFAULT FALSE,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
            question_text VARCHAR(255),
            weight DECIMAL(3,2),
            applicable_levels JSON,
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
            feedback TEXT,
            approved_at TIMESTAMP,
            PRIMARY KEY (session_id, student_id),
            FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES student_users(id) ON DELETE CASCADE,
            FOREIGN KEY (approved_by) REFERENCES staff_users(id) ON DELETE SET NULL
        )`,

        `CREATE TABLE IF NOT EXISTS gd_rules (
         level INT PRIMARY KEY,
        prep_time INT NOT NULL,
        discussion_time INT NOT NULL,
        penalty_threshold DECIMAL(3,1) NOT NULL,
        allow_override BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

// Analytics view
        `CREATE VIEW IF NOT EXISTS qualification_rates AS
        SELECT department, 
        COUNT(*) as total,
        SUM(CASE WHEN qualified_for_level > current_gd_level THEN 1 ELSE 0 END) as passed,
        (SUM(CASE WHEN qualified_for_level > current_gd_level THEN 1 ELSE 0 END) / COUNT(*)) * 100 as rate
        FROM student_users
        JOIN qualifications ON student_users.id = qualifications.student_id
        GROUP BY department`,

        `CREATE TABLE IF NOT EXISTS gd_session_topics (
    session_id VARCHAR(36) PRIMARY KEY,
    topic TEXT NOT NULL,
    prep_materials JSON,
    FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE
)`,

`CREATE TABLE IF NOT EXISTS session_phase_tracking (
    session_id VARCHAR(36),
    student_id VARCHAR(36),
    phase ENUM('prep', 'discussion', 'survey') NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id, student_id, phase),
    FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student_users(id) ON DELETE CASCADE
)`,

`CREATE TABLE IF NOT EXISTS venue_qr_codes (
    id VARCHAR(36) PRIMARY KEY,
    venue_id VARCHAR(36) NOT NULL,
    qr_data VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE
)`,

// Insert sample session topic
// `INSERT IGNORE INTO gd_session_topics (session_id, topic) VALUES 
// ('session1', 'The impact of AI on modern education')`,
`INSERT IGNORE INTO gd_session_topics (session_id, topic, prep_materials) VALUES 
('session1', 'The impact of AI on modern education', '{"articles": ["url1", "url2"]}')`,
// Insert sample phase tracking
`INSERT IGNORE INTO session_phase_tracking (session_id, student_id, phase) VALUES 
('session1', 'student1', 'prep')`,
    }

    for _, query := range createTables {
        if _, err := db.Exec(query); err != nil {
            return fmt.Errorf("error creating tables: %v", err)
        }
    }

    // Insert sample data with IGNORE to skip existing records
    sampleData := []string{
        // Admin user
        // `INSERT IGNORE INTO admin_users (id, email, password_hash) VALUES 
        // ('admin1', 'admin@example.com', '$2a$10$xJwL5v5Jz5TZfN5D5M7zOeJz5TZfN5D5M7zOeJz5TZfN5D5M7zOe')`,

        // Staff user
        `INSERT IGNORE INTO staff_users (id, email, password_hash, admin_id) VALUES 
        ('staff1', 'staff@example.com', '$2a$10$xJwL5v5Jz5TZfN5D5M7zOeJz5TZfN5D5M7zOeJz5TZfN5D5M7zOe', 'admin1')`,

        // Students
`INSERT IGNORE INTO student_users (id, email, password_hash, full_name, department, year, is_active) VALUES 
('student1', 'student1@example.com', '$2a$10$xJwL5v5Jz5TZfN5D5M7zOeJz5TZfN5D5M7zOeJz5TZfN5D5M7zOe', 'John Doe', 'CS', 3, TRUE),
('student2', 'student2@example.com', '$2a$10$xJwL5v5Jz5TZfN5D5M7zOeJz5TZfN5D5M7zOeJz5TZfN5D5M7zOe', 'Jane Smith', 'ECE', 2, TRUE)
`,


// Venues
        `INSERT IGNORE INTO venues (id, name, capacity, qr_secret, created_by) VALUES 
        ('venue1', 'Table 1-A', 10, 'venue1_secret123', 'admin1'),
        ('venue2', 'Room 3B', 15, 'venue2_secret456', 'admin1')`,


    
    }

    for _, query := range sampleData {
        if _, err := db.Exec(query); err != nil {
            log.Printf("Warning: inserting sample data: %v (this might be expected if data already exists)", err)
        }
    }
adminPassword := "admin123" 
hashedPassword, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
if err != nil {
    return fmt.Errorf("error hashing password: %v", err)
}

_, err = db.Exec(
    `INSERT IGNORE INTO admin_users (id, email, password_hash) VALUES 
    ('admin1', 'admin@example.com', ?)`,
    string(hashedPassword),
)
if err != nil {
    log.Printf("Warning: inserting admin user: %v", err)
}

hashedStudentPassword, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
if err != nil {
    log.Printf("Error hashing password: %v", err)
    // return
}

_, err = db.Exec(
    `INSERT INTO student_users 
    (id, email, password_hash, full_name, department, year, is_active) 
    VALUES (?, ?, ?, ?, ?, ?, ?) 
    ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    "student1",
    "student1@example.com",
    string(hashedStudentPassword),
    "Test Student",
    "CS",
    3,
    true,
)
if err != nil {
    log.Printf("Error inserting test student: %v", err)
}

// Add sample qualification data
_, err = db.Exec(`
	INSERT IGNORE INTO qualifications 
	(session_id, student_id, final_score, qualified_for_level, feedback) VALUES 
	('session1', 'student1', 
	 '{"leadership": 4.2, "communication": 3.8, "teamwork": 4.0}', 
	 2, 'Good participation but needs to work on time management')`)
if err != nil {
	log.Printf("Error inserting qualification data: %v", err)
}
    log.Println("Database initialization completed successfully!")


 go func() {
        for {
            time.Sleep(30 * time.Minute) // Run every 30 minutes
            _, err := db.Exec(`
                DELETE FROM session_phase_tracking 
                WHERE start_time < DATE_SUB(NOW(), INTERVAL 1 HOUR)`)
            if err != nil {
                log.Printf("Error cleaning up phase tracking: %v", err)
            }
        }
    }()

    return nil
}