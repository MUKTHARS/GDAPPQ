package routes

import (
	"gd/student/controllers"
	"gd/student/middleware"
	"net/http"
)

func SetupStudentRoutes() *http.ServeMux {
	router := http.NewServeMux()
	
	// Auth routes
	router.Handle("/student/login", http.HandlerFunc(controllers.StudentLogin))
	
	// Session routes
	router.Handle("/student/sessions", middleware.StudentOnly(
		http.HandlerFunc(controllers.GetAvailableSessions)))
	router.Handle("/student/sessions/join", middleware.StudentOnly(
		http.HandlerFunc(controllers.JoinSession)))
	router.Handle("/student/session", middleware.StudentOnly(
		http.HandlerFunc(controllers.GetSessionDetails)))
	
	// Survey routes
	router.Handle("/student/survey", middleware.StudentOnly(
		http.HandlerFunc(controllers.SubmitSurvey)))
	
	// Results routes
	router.Handle("/student/results", middleware.StudentOnly(
		http.HandlerFunc(controllers.GetResults)))
	
	return router
}

// package routes

// import (
// 	"gd/student/controllers"
// 	"gd/student/middleware"
// 	"net/http"
// )

// func SetupStudentRoutes() *http.ServeMux {
// 	router := http.NewServeMux()
	
// 	router.Handle("/student/login", http.HandlerFunc(controllers.StudentLogin))
// 	router.Handle("/student/sessions", middleware.StudentOnly(
// 		http.HandlerFunc(controllers.GetAvailableSessions)))
// 	router.Handle("/student/sessions/join", middleware.StudentOnly(
// 		http.HandlerFunc(controllers.JoinSession)))
	
// 	return router
// }