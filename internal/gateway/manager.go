package gateway

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"syscall"
	"time"

	"github.com/akarachen/proxy-up/internal/config"
)

const (
	defaultLogLevel   = "info"
	readyPollInterval = 250 * time.Millisecond
	readyTimeout      = 120 * time.Second
	sigTermTimeout    = 10 * time.Second
	sigKillTimeout    = 2 * time.Second
)

// Paths holds resolved file and directory paths for a running gateway session.
type Paths struct {
	WorkDir            string
	LogsDir            string
	PlanoConfigPath    string
	EnvoyConfigPath    string
	BrightstaffLogPath string
	EnvoyLogPath       string
}

// Manager manages the lifecycle of a proxy gateway instance
// (Brightstaff + Envoy child processes).
type Manager struct {
	mu sync.Mutex

	brightstaff *os.Process
	envoy       *os.Process
	paths       *Paths
	gatewayURL  string
	running     bool
}

// Status returns the current gateway status.
func (m *Manager) Status() config.Status {
	m.mu.Lock()
	defer m.mu.Unlock()
	if !m.running {
		return config.Status{Running: false}
	}
	workDir := ""
	if m.paths != nil {
		workDir = m.paths.WorkDir
	}
	return config.Status{Running: true, GatewayURL: m.gatewayURL, WorkDir: workDir}
}

func assertPortAvailable(host string, port int, label string) error {
	addr := net.JoinHostPort(host, fmt.Sprintf("%d", port))
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("%s %s is unavailable: %w", label, addr, err)
	}
	return ln.Close()
}

func validatePorts(ports ResolvedPorts, gatewayHost string) error {
	if gatewayHost == "" {
		gatewayHost = defaultGatewayHost
	}

	checks := []struct {
		host  string
		port  int
		label string
	}{
		{host: gatewayHost, port: ports.Gateway, label: "gateway listener"},
		{host: defaultInternalHost, port: ports.Internal, label: "internal Envoy listener"},
		{host: defaultInternalHost, port: ports.Brightstaff, label: "brightstaff listener"},
		{host: defaultInternalHost, port: ports.Admin, label: "Envoy admin listener"},
	}

	for _, check := range checks {
		if err := assertPortAvailable(check.host, check.port, check.label); err != nil {
			return err
		}
	}

	return nil
}

// Start starts the gateway using the given config and binary paths.
// Returns an error if already running or startup fails.
func (m *Manager) Start(cfg *config.ProxyConfig, envoyPath, brightstaffPath, wasmPath string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.running {
		return nil
	}

	generated, err := GenerateGatewayConfig(cfg, wasmPath)
	if err != nil {
		return fmt.Errorf("config generation failed: %w", err)
	}

	if err = validatePorts(generated.Ports, cfg.GatewayHost); err != nil {
		return err
	}

	workDir := cfg.WorkDir
	if workDir == "" {
		workDir, err = os.MkdirTemp("", "proxy-up-gateway-*")
		if err != nil {
			return fmt.Errorf("failed to create work dir: %w", err)
		}
	}

	logsDir := filepath.Join(workDir, "logs")
	if err = os.MkdirAll(logsDir, 0755); err != nil {
		return fmt.Errorf("failed to create logs dir: %w", err)
	}

	paths := &Paths{
		WorkDir:            workDir,
		LogsDir:            logsDir,
		PlanoConfigPath:    filepath.Join(workDir, "plano_config_rendered.yaml"),
		EnvoyConfigPath:    filepath.Join(workDir, "envoy.yaml"),
		BrightstaffLogPath: filepath.Join(logsDir, "brightstaff.log"),
		EnvoyLogPath:       filepath.Join(logsDir, "envoy.log"),
	}

	if err = os.WriteFile(paths.PlanoConfigPath, []byte(generated.PlanoConfig), 0644); err != nil {
		return fmt.Errorf("failed to write plano config: %w", err)
	}
	if err = os.WriteFile(paths.EnvoyConfigPath, []byte(generated.EnvoyConfig), 0644); err != nil {
		return fmt.Errorf("failed to write envoy config: %w", err)
	}

	logLevel := cfg.LogLevel
	if logLevel == "" {
		logLevel = defaultLogLevel
	}

	// Start Brightstaff
	brightstaffProc, err := startProcess(brightstaffPath, nil, map[string]string{
		"BIND_ADDRESS":              fmt.Sprintf("127.0.0.1:%d", generated.Ports.Brightstaff),
		"LLM_PROVIDER_ENDPOINT":     generated.InternalURL,
		"PLANO_CONFIG_PATH_RENDERED": paths.PlanoConfigPath,
		"RUST_LOG":                  logLevel,
	}, paths.BrightstaffLogPath)
	if err != nil {
		_ = os.RemoveAll(workDir)
		return fmt.Errorf("brightstaff failed to start: %w", err)
	}

	// Start Envoy
	envoyArgs := []string{
		"-c", paths.EnvoyConfigPath,
		"--component-log-level", fmt.Sprintf("wasm:%s", logLevel),
		"--log-format", "[%Y-%m-%d %T.%e][%l] %v",
	}
	envoyProc, err := startProcess(envoyPath, envoyArgs, nil, paths.EnvoyLogPath)
	if err != nil {
		stopProcess("brightstaff", brightstaffProc)
		_ = os.RemoveAll(workDir)
		return fmt.Errorf("envoy failed to start: %w", err)
	}

	// Wait until ready
	if err = waitUntilReady(generated.GatewayURL, brightstaffProc, envoyProc, paths); err != nil {
		stopProcess("envoy", envoyProc)
		stopProcess("brightstaff", brightstaffProc)
		_ = os.RemoveAll(workDir)
		return err
	}

	m.brightstaff = brightstaffProc
	m.envoy = envoyProc
	m.paths = paths
	m.gatewayURL = generated.GatewayURL
	m.running = true
	return nil
}

// Stop stops the gateway. If cleanup is true, the work directory is removed.
func (m *Manager) Stop(cleanup bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.running {
		return nil
	}

	var firstErr error
	if err := stopProcess("envoy", m.envoy); err != nil && firstErr == nil {
		firstErr = err
	}
	if err := stopProcess("brightstaff", m.brightstaff); err != nil && firstErr == nil {
		firstErr = err
	}

	if cleanup && m.paths != nil {
		_ = os.RemoveAll(m.paths.WorkDir)
	}

	m.brightstaff = nil
	m.envoy = nil
	m.running = false
	m.gatewayURL = ""

	return firstErr
}

// Restart stops and then starts the gateway with new config.
func (m *Manager) Restart(cfg *config.ProxyConfig, envoyPath, brightstaffPath, wasmPath string) error {
	cleanup := false
	if cfg.CleanupOnStop != nil {
		cleanup = *cfg.CleanupOnStop
	}
	if err := m.Stop(cleanup); err != nil {
		return fmt.Errorf("stop failed during restart: %w", err)
	}
	return m.Start(cfg, envoyPath, brightstaffPath, wasmPath)
}

// startProcess launches an executable, wiring stdout+stderr to logPath.
// env is merged with the current process environment.
func startProcess(executable string, args []string, env map[string]string, logPath string) (*os.Process, error) {
	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to open log file %s: %w", logPath, err)
	}
	defer logFile.Close()

	cmd := exec.Command(executable, args...)
	cmd.Stdout = logFile
	cmd.Stderr = logFile

	if len(env) > 0 {
		cmd.Env = os.Environ()
		for k, v := range env {
			cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", k, v))
		}
	}

	if err = cmd.Start(); err != nil {
		return nil, err
	}

	// Reap the child in the background so it doesn't become a zombie.
	go func() { _ = cmd.Wait() }()

	return cmd.Process, nil
}

// stopProcess sends SIGTERM, waits up to 10s, then SIGKILL.
func stopProcess(name string, proc *os.Process) error {
	if proc == nil {
		return nil
	}

	if err := proc.Signal(syscall.SIGTERM); err != nil {
		// Already exited — not an error.
		return nil
	}

	done := make(chan struct{})
	go func() {
		defer close(done)
		// proc.Wait is called in the background goroutine from startProcess,
		// so we poll the signal result via Kill(0) instead.
		for {
			time.Sleep(100 * time.Millisecond)
			if err := proc.Signal(syscall.Signal(0)); err != nil {
				return // process no longer exists
			}
		}
	}()

	select {
	case <-done:
		return nil
	case <-time.After(sigTermTimeout):
		// SIGTERM timeout — escalate to SIGKILL
		_ = proc.Signal(syscall.SIGKILL)
		select {
		case <-done:
			return nil
		case <-time.After(sigKillTimeout):
			return fmt.Errorf("%s did not stop cleanly", name)
		}
	}
}

// waitUntilReady polls GET /v1/models until it returns 2xx, or times out.
func waitUntilReady(gatewayURL string, brightstaffProc, envoyProc *os.Process, paths *Paths) error {
	client := &http.Client{Timeout: time.Second}
	deadline := time.Now().Add(readyTimeout)

	for {
		if time.Now().After(deadline) {
			return fmt.Errorf("timed out waiting for the proxy gateway to become ready; see %s", paths.WorkDir)
		}

		if !isProcessRunning(brightstaffProc) {
			return fmt.Errorf("brightstaff exited before the gateway became ready; see %s", paths.BrightstaffLogPath)
		}
		if !isProcessRunning(envoyProc) {
			return fmt.Errorf("envoy exited before the gateway became ready; see %s", paths.EnvoyLogPath)
		}

		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		req, _ := http.NewRequestWithContext(ctx, http.MethodGet, gatewayURL+"/v1/models", nil)
		resp, err := client.Do(req)
		cancel()
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode >= 200 && resp.StatusCode < 300 {
				return nil
			}
		}

		time.Sleep(readyPollInterval)
	}
}

// isProcessRunning returns true if the process is still alive.
func isProcessRunning(proc *os.Process) bool {
	if proc == nil {
		return false
	}
	return proc.Signal(syscall.Signal(0)) == nil
}
