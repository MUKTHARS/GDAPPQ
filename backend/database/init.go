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
            completed_at TIMESTAMP NULL DEFAULT NULL,
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
           
    penalty_points INT DEFAULT 0,
    is_biased BOOLEAN DEFAULT FALSE,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (responder_id) REFERENCES student_users(id) ON DELETE CASCADE,
            FOREIGN KEY (first_place) REFERENCES student_users(id) ON DELETE SET NULL,
            FOREIGN KEY (second_place) REFERENCES student_users(id) ON DELETE SET NULL,
            FOREIGN KEY (third_place) REFERENCES student_users(id) ON DELETE SET NULL
        )`,

        
        `CREATE TABLE IF NOT EXISTS gd_rules (
         level INT PRIMARY KEY,
        prep_time INT NOT NULL,
        discussion_time INT NOT NULL,
        penalty_threshold DECIMAL(3,1) NOT NULL,
        allow_override BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,



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

`CREATE TABLE IF NOT EXISTS survey_results (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,  
    responder_id VARCHAR(36) NOT NULL, 
    question_number INT NOT NULL,
    ranks INT NOT NULL,  
    score INT NOT NULL, 
    is_current_session TINYINT(1) DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
/**    Dont remove this ----- > CREATE INDEX idx_survey_results_session_completed ON survey_results (session_id, is_completed) 
CREATE INDEX idx_survey_completion_session ON survey_completion (session_id);
CREATE INDEX IF NOT EXISTS idx_survey_results_session_student ON survey_results (session_id, student_id);
**/
    FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student_users(id) ON DELETE CASCADE,
    FOREIGN KEY (responder_id) REFERENCES student_users(id) ON DELETE CASCADE,
    UNIQUE KEY (session_id, student_id, question_number, ranks)  
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
// Add to your init.go file (append to createTables)
`CREATE TABLE IF NOT EXISTS survey_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_text VARCHAR(255) NOT NULL,
    weight DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    applicable_levels JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS question_timers (
    session_id VARCHAR(36),
    question_id INT,
    end_time DATETIME NOT NULL,
    PRIMARY KEY (session_id, question_id),
    FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE
)`,




`CREATE TABLE IF NOT EXISTS survey_penalties (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    question_id INT NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    penalty_points INT NOT NULL DEFAULT 1,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES gd_sessions(id),
    FOREIGN KEY (student_id) REFERENCES student_users(id)
);`,

`CREATE TABLE IF NOT EXISTS survey_completion (
    session_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id, student_id),
    FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student_users(id) ON DELETE CASCADE
);`,

`CREATE TABLE IF NOT EXISTS survey_timeouts (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    question_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES gd_sessions(id),
    FOREIGN KEY (student_id) REFERENCES student_users(id)
);`,
`CREATE TABLE IF NOT EXISTS session_feedback (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES gd_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student_users(id) ON DELETE CASCADE,
    UNIQUE KEY (session_id, student_id)
)`,



// Add sample questions
`INSERT IGNORE INTO survey_questions (question_text, weight, applicable_levels) VALUES 
('Clarity of arguments', 1.5, '[1,2,3,4]'),
('Contribution to discussion', 1.2, '[1,2,3,4]'),
('Teamwork and collaboration', 1.0, '[1,2,3,4]'),
('Logical reasoning', 1.3, '[1,2,3,4]'),
('Communication skills', 1.1, '[1,2,3,4]')`,
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

 go func() {
        for {
            time.Sleep(30 * time.Minute) // Run every 30 minutes
            _, err := db.Exec(`
                DELETE FROM session_phase_tracking 
                WHERE start_time < DATE_SUB(NOW(), INTERVAL 30 MINUTE)`)
            if err != nil {
                log.Printf("Error cleaning up phase tracking: %v", err)
            }
        }
    }()

    return nil
}