package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/akarachen/proxy-up/internal/api"
	"github.com/akarachen/proxy-up/internal/config"
	"github.com/akarachen/proxy-up/internal/gateway"
	"github.com/akarachen/proxy-up/internal/install"
)

const (
	defaultPort     = 3000
	shutdownTimeout = 5 * time.Second
)

type proxyUpApp struct {
	cleanupOnStop bool
	manager       *gateway.Manager
	httpServer    *http.Server
	listener      net.Listener
	port          int
}

func newProxyUpApp() (*proxyUpApp, error) {
	if err := install.CheckPlatform(); err != nil {
		return nil, err
	}

	if err := config.EnsureDefaultConfig(); err != nil {
		return nil, fmt.Errorf("failed to initialize config: %w", err)
	}

	cfg, err := config.LoadConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %w", err)
	}

	envoyPath, brightstaffPath, wasmPath, err := install.EnsureBinaries()
	if err != nil {
		return nil, fmt.Errorf("failed to extract binaries: %w", err)
	}

	mgr := &gateway.Manager{}
	srv := api.NewServer(mgr, envoyPath, brightstaffPath, wasmPath)
	port := resolvePort()

	app := &proxyUpApp{
		manager:       mgr,
		port:          port,
		cleanupOnStop: cleanupOnStop(cfg),
		httpServer: &http.Server{
			Addr:    fmt.Sprintf("127.0.0.1:%d", port),
			Handler: srv.Handler(),
		},
	}
	return app, nil
}

func (a *proxyUpApp) Start(openUI bool) error {
	ln, err := net.Listen("tcp", a.httpServer.Addr)
	if err != nil {
		return fmt.Errorf("failed to listen on %s: %w", a.httpServer.Addr, err)
	}

	a.listener = ln
	log.Printf("proxy-up listening on %s", a.serverURL())

	go func() {
		if err := a.httpServer.Serve(ln); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("HTTP server error: %v", err)
		}
	}()

	if openUI {
		openBrowser(a.serverURL())
	}

	return nil
}

func (a *proxyUpApp) Stop() error {
	var firstErr error

	if err := a.manager.Stop(a.cleanupOnStop); err != nil {
		firstErr = err
	}

	if a.listener == nil {
		return firstErr
	}

	ctx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()

	if err := a.httpServer.Shutdown(ctx); err != nil && !errors.Is(err, http.ErrServerClosed) && firstErr == nil {
		firstErr = err
	}

	return firstErr
}

func (a *proxyUpApp) serverURL() string {
	return fmt.Sprintf("http://127.0.0.1:%d", a.port)
}

func resolvePort() int {
	if raw := os.Getenv("PORT"); raw != "" {
		if port, err := strconv.Atoi(raw); err == nil {
			return port
		}
	}
	return defaultPort
}

func cleanupOnStop(cfg *config.ProxyConfig) bool {
	if cfg != nil && cfg.CleanupOnStop != nil {
		return *cfg.CleanupOnStop
	}
	return false
}
