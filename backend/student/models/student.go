package models

type Student struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Level     int    `json:"level"`
	PhotoURL  string `json:"photo_url"`
}

type Session struct {
	ID        string `json:"id"`
	Venue     string `json:"venue"`
	StartTime string `json:"start_time"`
}