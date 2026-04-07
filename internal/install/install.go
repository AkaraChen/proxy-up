// Package install handles extraction of embedded binaries to the local filesystem.
package install

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"github.com/akarachen/proxy-up/assets"
)

// BinDir returns the directory where binaries are extracted at runtime.
func BinDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		panic(fmt.Sprintf("cannot resolve home directory: %v", err))
	}
	return filepath.Join(home, ".config", "proxy-up", "bin")
}

// CheckPlatform returns an error if the current platform is not darwin/arm64.
func CheckPlatform() error {
	if runtime.GOOS != "darwin" || runtime.GOARCH != "arm64" {
		return fmt.Errorf("proxy-up only supports macOS arm64; current platform: %s/%s", runtime.GOOS, runtime.GOARCH)
	}
	return nil
}

// EnsureBinaries extracts embedded binaries to BinDir() if they are missing or stale.
// Returns paths to envoy, brightstaff, and llm_gateway.wasm.
func EnsureBinaries() (envoyPath, brightstaffPath, wasmPath string, err error) {
	if err = CheckPlatform(); err != nil {
		return
	}

	binDir := BinDir()
	if err = os.MkdirAll(binDir, 0755); err != nil {
		err = fmt.Errorf("failed to create bin dir %s: %w", binDir, err)
		return
	}

	envoyPath = filepath.Join(binDir, "envoy")
	brightstaffPath = filepath.Join(binDir, "brightstaff")
	wasmPath = filepath.Join(binDir, "llm_gateway.wasm")

	if err = extractIfNeeded(envoyPath, assets.EnvoyDarwinArm64, true); err != nil {
		return
	}
	if err = extractIfNeeded(brightstaffPath, assets.BrightstaffDarwinArm64, true); err != nil {
		return
	}
	if err = extractIfNeeded(wasmPath, assets.LlmGatewayWasm, false); err != nil {
		return
	}
	return
}

func extractIfNeeded(dst string, data []byte, executable bool) error {
	if len(data) == 0 {
		return fmt.Errorf("embedded asset %q is empty — run 'make fetch-assets' before building", filepath.Base(dst))
	}

	// Skip extraction if file already exists with the same size.
	if info, err := os.Stat(dst); err == nil && info.Size() == int64(len(data)) {
		return nil
	}

	tmp := dst + ".tmp"
	perm := os.FileMode(0644)
	if executable {
		perm = 0755
	}

	if err := os.WriteFile(tmp, data, perm); err != nil {
		return fmt.Errorf("failed to write %s: %w", dst, err)
	}

	if err := os.Rename(tmp, dst); err != nil {
		os.Remove(tmp)
		return fmt.Errorf("failed to install %s: %w", dst, err)
	}
	return nil
}
