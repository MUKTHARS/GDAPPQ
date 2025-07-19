package routes

import (
	"gd/student/controllers"
	"gd/student/middleware"
	"net/http"
)

func SetupStudentRoutes() *http.ServeMux {
	router := http.NewServeMux()
	
	router.Handle("/student/login", http.HandlerFunc(controllers.StudentLogin))
	router.Handle("/student/sessions", middleware.StudentOnly(
		http.HandlerFunc(controllers.GetAvailableSessions)))
	router.Handle("/student/sessions/join", middleware.StudentOnly(
		http.HandlerFunc(controllers.JoinSession)))
	
	return router
}