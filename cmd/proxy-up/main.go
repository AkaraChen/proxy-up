package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"strconv"
	"syscall"
	"time"

	"github.com/akarachen/proxy-up/internal/api"
	"github.com/akarachen/proxy-up/internal/config"
	"github.com/akarachen/proxy-up/internal/gateway"
	"github.com/akarachen/proxy-up/internal/install"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

func run() error {
	if err := install.CheckPlatform(); err != nil {
		return err
	}

	if err := config.EnsureDefaultConfig(); err != nil {
		return fmt.Errorf("failed to initialize config: %w", err)
	}

	envoyPath, brightstaffPath, wasmPath, err := install.EnsureBinaries()
	if err != nil {
		return fmt.Errorf("failed to extract binaries: %w", err)
	}

	port := 3000
	if p := os.Getenv("PORT"); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			port = n
		}
	}

	mgr := &gateway.Manager{}
	srv := api.NewServer(mgr, envoyPath, brightstaffPath, wasmPath)

	httpServer := &http.Server{
		Addr:    fmt.Sprintf("127.0.0.1:%d", port),
		Handler: srv.Handler(),
	}

	// Start listening before opening the browser so the port is ready.
	ln, err := net.Listen("tcp", httpServer.Addr)
	if err != nil {
		return fmt.Errorf("failed to listen on %s: %w", httpServer.Addr, err)
	}

	serverURL := fmt.Sprintf("http://127.0.0.1:%d", port)
	log.Printf("proxy-up listening on %s", serverURL)

	go func() {
		if err := httpServer.Serve(ln); err != nil && err != http.ErrServerClosed {
			log.Printf("HTTP server error: %v", err)
		}
	}()

	openBrowser(serverURL)

	// Wait for shutdown signal.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down...")

	// Stop the gateway (ignore errors — best effort).
	_ = mgr.Stop(false)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return httpServer.Shutdown(ctx)
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		return
	}
	_ = cmd.Start()
}
