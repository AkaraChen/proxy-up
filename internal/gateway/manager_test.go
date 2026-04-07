package gateway

import (
	"net"
	"strings"
	"testing"
)

func allocateFreePort(t *testing.T) int {
	t.Helper()

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to allocate free port: %v", err)
	}
	defer ln.Close()

	return ln.Addr().(*net.TCPAddr).Port
}

func TestValidatePortsSucceedsForAvailablePorts(t *testing.T) {
	ports := ResolvedPorts{
		Gateway:     allocateFreePort(t),
		Internal:    allocateFreePort(t),
		Brightstaff: allocateFreePort(t),
		Admin:       allocateFreePort(t),
	}

	if err := validatePorts(ports, defaultGatewayHost); err != nil {
		t.Fatalf("expected ports to validate, got %v", err)
	}
}

func TestValidatePortsDetectsOccupiedBrightstaffPort(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to reserve occupied port: %v", err)
	}
	defer ln.Close()

	occupiedPort := ln.Addr().(*net.TCPAddr).Port
	ports := ResolvedPorts{
		Gateway:     allocateFreePort(t),
		Internal:    allocateFreePort(t),
		Brightstaff: occupiedPort,
		Admin:       allocateFreePort(t),
	}

	err = validatePorts(ports, defaultGatewayHost)
	if err == nil {
		t.Fatal("expected occupied brightstaff port to fail validation")
	}
	if !strings.Contains(err.Error(), "brightstaff listener") {
		t.Fatalf("expected brightstaff listener error, got %v", err)
	}
}
