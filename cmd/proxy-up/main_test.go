package main

import (
	"path/filepath"
	"testing"
)

func TestResolvePort(t *testing.T) {
	t.Setenv("PORT", "4123")
	if got := resolvePort(); got != 4123 {
		t.Fatalf("expected port 4123, got %d", got)
	}
}

func TestResolvePortFallsBackToDefault(t *testing.T) {
	t.Setenv("PORT", "invalid")
	if got := resolvePort(); got != defaultPort {
		t.Fatalf("expected default port %d, got %d", defaultPort, got)
	}
}

func TestNewServiceConfig(t *testing.T) {
	t.Setenv("PORT", "3555")

	cfg := newServiceConfig()

	if cfg.Name != serviceName {
		t.Fatalf("expected service name %q, got %q", serviceName, cfg.Name)
	}
	if len(cfg.Arguments) != 1 || cfg.Arguments[0] != "run" {
		t.Fatalf("expected service arguments [run], got %v", cfg.Arguments)
	}
	if got := cfg.Option["UserService"]; got != true {
		t.Fatalf("expected UserService=true, got %#v", got)
	}
	if got := cfg.Option["RunAtLoad"]; got != true {
		t.Fatalf("expected RunAtLoad=true, got %#v", got)
	}
	if got := cfg.EnvVars["PORT"]; got != "3555" {
		t.Fatalf("expected PORT env var to be preserved, got %q", got)
	}
	if got := serviceLogDir(); filepath.Base(got) != "logs" {
		t.Fatalf("expected service log dir to end with logs, got %q", got)
	}
}

func TestRunHelpCommands(t *testing.T) {
	for _, arg := range []string{"help", "-h", "--help"} {
		if err := run([]string{arg}); err != nil {
			t.Fatalf("expected %q to succeed, got %v", arg, err)
		}
	}
}
