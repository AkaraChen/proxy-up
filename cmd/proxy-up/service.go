package main

import (
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/akarachen/proxy-up/internal/config"
	"github.com/kardianos/service"
)

const (
	serviceName        = "proxy-up"
	servicePollDelay   = 250 * time.Millisecond
	serviceStartWait   = 5 * time.Second
	serviceDescription = "proxy-up local gateway and management UI"
)

type serviceProgram struct {
	app *proxyUpApp
}

func (p *serviceProgram) Start(service.Service) error {
	app, err := newProxyUpApp()
	if err != nil {
		return err
	}

	p.app = app
	return p.app.Start(false)
}

func (p *serviceProgram) Stop(service.Service) error {
	if p.app == nil {
		return nil
	}
	return p.app.Stop()
}

func runServiceCommand() error {
	svc, err := newSystemService()
	if err != nil {
		return err
	}
	return svc.Run()
}

// getServiceStatus returns the service status and handles common error patterns.
// The returned error is wrapped with context if it's not service.ErrNotInstalled.
func getServiceStatus(svc service.Service) (service.Status, error) {
	status, err := svc.Status()
	if err != nil && !errors.Is(err, service.ErrNotInstalled) {
		return status, fmt.Errorf("failed to inspect service status: %w", err)
	}
	return status, err
}

func runInstallCommand() error {
	if _, err := newProxyUpApp(); err != nil {
		return err
	}

	svc, err := newSystemService()
	if err != nil {
		return err
	}

	status, err := getServiceStatus(svc)
	if errors.Is(err, service.ErrNotInstalled) {
		if err := svc.Install(); err != nil {
			return fmt.Errorf("failed to install service: %w", err)
		}
		log.Printf("proxy-up service installed")
		return nil
	}
	if err != nil {
		return err
	}
	log.Printf("proxy-up service is already installed (%s)", serviceStatusString(status))
	return nil
}

func runStartCommand() error {
	if _, err := newProxyUpApp(); err != nil {
		return err
	}

	svc, err := newSystemService()
	if err != nil {
		return err
	}

	status, err := getServiceStatus(svc)
	if errors.Is(err, service.ErrNotInstalled) {
		if err := svc.Install(); err != nil {
			return fmt.Errorf("failed to install service: %w", err)
		}
	} else if err != nil {
		return err
	} else if status == service.StatusRunning {
		openBrowser(localServerURL())
		log.Printf("proxy-up service is already running at %s", localServerURL())
		return nil
	}

	if err := svc.Start(); err != nil {
		return fmt.Errorf("failed to start service: %w", err)
	}
	if err := waitForServiceRunning(svc, serviceStartWait); err != nil {
		return err
	}

	openBrowser(localServerURL())
	log.Printf("proxy-up service started at %s", localServerURL())
	return nil
}

func runStopCommand() error {
	svc, err := newSystemService()
	if err != nil {
		return err
	}

	status, err := getServiceStatus(svc)
	if errors.Is(err, service.ErrNotInstalled) {
		log.Printf("proxy-up service is not installed")
		return nil
	}
	if err != nil {
		return err
	}
	if status != service.StatusRunning {
		log.Printf("proxy-up service is already stopped")
		return nil
	}

	if err := svc.Stop(); err != nil {
		return fmt.Errorf("failed to stop service: %w", err)
	}

	log.Printf("proxy-up service stopped")
	return nil
}

func runUninstallCommand() error {
	svc, err := newSystemService()
	if err != nil {
		return err
	}

	status, err := getServiceStatus(svc)
	if errors.Is(err, service.ErrNotInstalled) {
		log.Printf("proxy-up service is not installed")
		return nil
	}
	if err != nil {
		return err
	}
	if status == service.StatusRunning {
		if err := svc.Stop(); err != nil {
			return fmt.Errorf("failed to stop service before uninstall: %w", err)
		}
	}

	if err := svc.Uninstall(); err != nil {
		return fmt.Errorf("failed to uninstall service: %w", err)
	}

	log.Printf("proxy-up service uninstalled")
	return nil
}

func newSystemService() (service.Service, error) {
	if err := os.MkdirAll(serviceLogDir(), 0755); err != nil {
		return nil, fmt.Errorf("failed to create service log dir: %w", err)
	}
	return service.New(&serviceProgram{}, newServiceConfig())
}

func newServiceConfig() *service.Config {
	return &service.Config{
		Name:        serviceName,
		DisplayName: serviceName,
		Description: serviceDescription,
		Arguments:   []string{"run"},
		Option: service.KeyValue{
			"UserService":  true,
			"RunAtLoad":    true,
			"KeepAlive":    true,
			"LogDirectory": serviceLogDir(),
		},
		EnvVars: serviceEnvVars(),
	}
}

func waitForServiceRunning(svc service.Service, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for {
		status, err := svc.Status()
		if err == nil && status == service.StatusRunning {
			return nil
		}
		if time.Now().After(deadline) {
			if err != nil {
				return fmt.Errorf("service did not reach running state: %w", err)
			}
			return fmt.Errorf("service did not reach running state; last status: %s", serviceStatusString(status))
		}
		time.Sleep(servicePollDelay)
	}
}

func localServerURL() string {
	return fmt.Sprintf("http://127.0.0.1:%d", resolvePort())
}

func serviceLogDir() string {
	return filepath.Join(filepath.Dir(config.ConfigFilePath()), "logs")
}

func serviceEnvVars() map[string]string {
	if port := os.Getenv("PORT"); port != "" {
		return map[string]string{"PORT": port}
	}
	return nil
}

func serviceStatusString(status service.Status) string {
	switch status {
	case service.StatusRunning:
		return "running"
	case service.StatusStopped:
		return "stopped"
	default:
		return "unknown"
	}
}
