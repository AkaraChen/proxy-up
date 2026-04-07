package api

import (
	"encoding/json"
	"io/fs"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/akarachen/proxy-up/assets"
	"github.com/akarachen/proxy-up/internal/config"
	"github.com/akarachen/proxy-up/internal/gateway"
)

// Server holds the dependencies for the API handlers.
type Server struct {
	manager        *gateway.Manager
	envoyPath      string
	brightstaffPath string
	wasmPath       string
}

// NewServer creates a new API server.
func NewServer(mgr *gateway.Manager, envoyPath, brightstaffPath, wasmPath string) *Server {
	return &Server{
		manager:        mgr,
		envoyPath:      envoyPath,
		brightstaffPath: brightstaffPath,
		wasmPath:       wasmPath,
	}
}

// Handler returns the chi router with all routes registered.
func (s *Server) Handler() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)

	r.Get("/api/config", s.getConfig)
	r.Post("/api/config", s.saveConfig)
	r.Put("/api/config", s.saveConfig)
	r.Get("/api/status", s.getStatus)
	r.Post("/api/start", s.startGateway)
	r.Post("/api/stop", s.stopGateway)
	r.Post("/api/restart", s.restartGateway)

	// Serve embedded frontend with SPA fallback.
	webFS, err := fs.Sub(assets.WebFS, "web")
	if err != nil {
		panic("failed to sub web FS: " + err.Error())
	}
	fileServer := http.FileServer(http.FS(webFS))
	r.Get("/*", spaHandler(fileServer, webFS))

	return r
}

// spaHandler serves static files from webFS; falls back to index.html for
// paths that don't correspond to a real file (client-side routing).
func spaHandler(fileServer http.Handler, webFS fs.FS) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}
		if _, err := fs.Stat(webFS, path); err != nil {
			// Not found — serve index.html for SPA client-side routing.
			r2 := r.Clone(r.Context())
			r2.URL.Path = "/"
			fileServer.ServeHTTP(w, r2)
			return
		}
		fileServer.ServeHTTP(w, r)
	}
}

// corsMiddleware adds permissive CORS headers for local dev.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// GET /api/config
func (s *Server) getConfig(w http.ResponseWriter, r *http.Request) {
	cfg, err := config.LoadConfig()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load configuration"})
		return
	}
	if cfg == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "No configuration found"})
		return
	}
	writeJSON(w, http.StatusOK, cfg)
}

// POST/PUT /api/config
func (s *Server) saveConfig(w http.ResponseWriter, r *http.Request) {
	var cfg config.ProxyConfig
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
		return
	}
	if err := config.SaveConfig(cfg); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"message": "Configuration saved to ~/.config/proxy-up/config.json",
		"path":    config.ConfigFilePath(),
	})
}

// GET /api/status
func (s *Server) getStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.manager.Status())
}

// POST /api/start
func (s *Server) startGateway(w http.ResponseWriter, r *http.Request) {
	cfg, err := config.LoadConfig()
	if err != nil || cfg == nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "No configuration found. Please save configuration first"})
		return
	}
	if err = s.manager.Start(cfg, s.envoyPath, s.brightstaffPath, s.wasmPath); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	st := s.manager.Status()
	writeJSON(w, http.StatusOK, map[string]any{
		"success":    true,
		"message":    "Proxy started successfully",
		"gatewayUrl": st.GatewayURL,
		"workDir":    st.WorkDir,
	})
}

// POST /api/stop
func (s *Server) stopGateway(w http.ResponseWriter, r *http.Request) {
	if err := s.manager.Stop(true); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "message": "Proxy stopped successfully"})
}

// POST /api/restart
func (s *Server) restartGateway(w http.ResponseWriter, r *http.Request) {
	cfg, err := config.LoadConfig()
	if err != nil || cfg == nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "No configuration found. Please save configuration first"})
		return
	}
	if err = s.manager.Restart(cfg, s.envoyPath, s.brightstaffPath, s.wasmPath); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	st := s.manager.Status()
	writeJSON(w, http.StatusOK, map[string]any{
		"success":    true,
		"message":    "Proxy restarted successfully",
		"gatewayUrl": st.GatewayURL,
		"workDir":    st.WorkDir,
	})
}
