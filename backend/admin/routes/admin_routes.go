// routes/admin_routes.go
package routes

import (
	"gd/admin/controllers"
	"gd/admin/middleware"
	"log"
	// "strings"

	// "log"
	"net/http"
)

func SetupAdminRoutes() *http.ServeMux {
	router := http.NewServeMux()
	
	// Auth routes
	router.Handle("/admin/login", http.HandlerFunc(controllers.AdminLogin))

	
	
	// QR routes
    router.Handle("/admin/qr", middleware.AdminOnly(http.HandlerFunc(controllers.GenerateQR)))
    
    // Session routes
    router.Handle("/admin/sessions/bulk", middleware.AdminOnly(http.HandlerFunc(controllers.CreateBulkSessions)))
    
    // Venue routes - single handler for both GET and POST
    router.Handle("/admin/venues", middleware.AdminOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    switch r.Method {
    case http.MethodGet:
        controllers.GetVenues(w, r)
    case http.MethodPost:
        controllers.CreateVenue(w, r)
    case http.MethodPut:
        controllers.UpdateVenue(w, r)
    default:
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    }
})))
router.Handle("/admin/venues/", middleware.AdminOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    if r.Method == http.MethodPut {
        controllers.UpdateVenue(w, r)
    } else {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    }
})))
	log.Println("Venue routes setup complete")
	return router

}