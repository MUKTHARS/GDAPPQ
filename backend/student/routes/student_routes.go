package routes

import (
	"gd/student/controllers"
	"gd/student/middleware"
	"net/http"
)

func SetupStudentRoutes() *http.ServeMux {
    router := http.NewServeMux()
    
    // Auth
    router.Handle("/student/login", http.HandlerFunc(controllers.StudentLogin))
    
    // Session Management
    router.Handle("/student/sessions", middleware.StudentOnly(
        http.HandlerFunc(controllers.GetAvailableSessions)))
    router.Handle("/student/sessions/book", middleware.StudentOnly(
        http.HandlerFunc(controllers.BookVenue)))  // Add this line
    router.Handle("/student/sessions/join", middleware.StudentOnly(
        http.HandlerFunc(controllers.JoinSession)))
    router.Handle("/student/session", middleware.StudentOnly(
        http.HandlerFunc(controllers.GetSessionDetails)))
    
    // Survey System
    router.Handle("/student/survey", middleware.StudentOnly(
        http.HandlerFunc(controllers.SubmitSurvey)))
    
    // Results
    router.Handle("/student/results", middleware.StudentOnly(
        http.HandlerFunc(controllers.GetResults)))

   router.Handle("/student/session/check", middleware.StudentOnly(
    http.HandlerFunc(controllers.CheckBooking)))
router.Handle("/student/session/cancel", middleware.StudentOnly(
    http.HandlerFunc(controllers.CancelBooking)))
    return router
}

// func SetupStudentRoutes() *http.ServeMux {
// 	router := http.NewServeMux()
	
// 	// Auth
// 	router.Handle("/student/login", http.HandlerFunc(controllers.StudentLogin))
	
// 	// Session Management
// 	router.Handle("/student/sessions", middleware.StudentOnly(
// 		http.HandlerFunc(controllers.GetAvailableSessions)))
// 	router.Handle("/student/sessions/join", middleware.StudentOnly(
// 		http.HandlerFunc(controllers.JoinSession)))
// 	router.Handle("/student/session", middleware.StudentOnly(
// 		http.HandlerFunc(controllers.GetSessionDetails)))
	
// 	// Survey System
// 	router.Handle("/student/survey", middleware.StudentOnly(
// 		http.HandlerFunc(controllers.SubmitSurvey)))
	
// 	// Results
// 	router.Handle("/student/results", middleware.StudentOnly(
// 		http.HandlerFunc(controllers.GetResults)))
	
// 	return router
// }

