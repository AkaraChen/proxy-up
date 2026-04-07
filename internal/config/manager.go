// Package config handles loading and saving proxy-up configuration.
package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// ProviderOptions configures a single LLM provider.
type ProviderOptions struct {
	Model             string `json:"model"`
	Provider          string `json:"provider,omitempty"`
	APIKey            string `json:"apiKey,omitempty"`
	BaseURL           string `json:"baseUrl,omitempty"`
	Default           bool   `json:"default,omitempty"`
	Name              string `json:"name,omitempty"`
	PassthroughAuth   bool   `json:"passthroughAuth,omitempty"`
	ProviderInterface string `json:"providerInterface,omitempty"`
}

// Ports configures the ports used by the gateway.
type Ports struct {
	Gateway     *int `json:"gateway,omitempty"`
	Internal    *int `json:"internal,omitempty"`
	Brightstaff *int `json:"brightstaff,omitempty"`
	Admin       *int `json:"admin,omitempty"`
}

// ModelAlias maps an alias name to a target model. Supports both "target" string
// and {"target": "..."} object forms in JSON.
type ModelAlias struct {
	Target string `json:"target"`
}

func (m *ModelAlias) UnmarshalJSON(data []byte) error {
	// Accept bare string: "openai/gpt-4"
	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		m.Target = s
		return nil
	}
	// Accept object: {"target": "openai/gpt-4"}
	type alias struct{ Target string `json:"target"` }
	var obj alias
	if err := json.Unmarshal(data, &obj); err != nil {
		return err
	}
	m.Target = obj.Target
	return nil
}

// ArtifactOptions overrides where artifacts (binaries, wasm) are sourced from.
type ArtifactOptions struct {
	BrightstaffPath    string `json:"brightstaffPath,omitempty"`
	EnvoyPath          string `json:"envoyPath,omitempty"`
	LlmGatewayWasmPath string `json:"llmGatewayWasmPath,omitempty"`
	PlanoVersion       string `json:"planoVersion,omitempty"`
	EnvoyVersion       string `json:"envoyVersion,omitempty"`
}

// ProxyConfig is the top-level configuration stored in ~/.config/proxy-up/config.json.
type ProxyConfig struct {
	Providers     []ProviderOptions     `json:"providers"`
	Ports         *Ports                `json:"ports,omitempty"`
	GatewayHost   string                `json:"gatewayHost,omitempty"`
	LogLevel      string                `json:"logLevel,omitempty"`
	ModelAliases  map[string]ModelAlias `json:"modelAliases,omitempty"`
	Artifacts     *ArtifactOptions      `json:"artifacts,omitempty"`
	CleanupOnStop *bool                 `json:"cleanupOnStop,omitempty"`
	WorkDir       string                `json:"workDir,omitempty"`
}

// Status is the runtime status of the gateway.
type Status struct {
	Running    bool   `json:"running"`
	GatewayURL string `json:"gatewayUrl,omitempty"`
	WorkDir    string `json:"workDir,omitempty"`
}

func configDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		panic(fmt.Sprintf("cannot resolve home directory: %v", err))
	}
	return filepath.Join(home, ".config", "proxy-up")
}

func configFile() string {
	return filepath.Join(configDir(), "config.json")
}

// EnsureDefaultConfig creates ~/.config/proxy-up/config.json with defaults if it does not exist.
func EnsureDefaultConfig() error {
	dir := configDir()
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create config dir: %w", err)
	}
	if _, err := os.Stat(configFile()); os.IsNotExist(err) {
		t := true
		return SaveConfig(ProxyConfig{
			Providers:     []ProviderOptions{},
			LogLevel:      "info",
			CleanupOnStop: &t,
		})
	}
	return nil
}

// LoadConfig loads the current configuration. Returns nil if no config file exists.
func LoadConfig() (*ProxyConfig, error) {
	data, err := os.ReadFile(configFile())
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to read config: %w", err)
	}
	var cfg ProxyConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}
	return &cfg, nil
}

// SaveConfig writes the configuration to disk.
func SaveConfig(cfg ProxyConfig) error {
	if err := os.MkdirAll(configDir(), 0755); err != nil {
		return fmt.Errorf("failed to create config dir: %w", err)
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}
	return os.WriteFile(configFile(), data, 0644)
}

// ConfigFilePath returns the absolute path to the config file.
func ConfigFilePath() string {
	return configFile()
}
