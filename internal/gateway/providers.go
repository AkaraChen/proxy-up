package gateway

import (
	"fmt"
	"hash/fnv"
	"net/url"
	"strings"

	"github.com/akarachen/proxy-up/internal/config"
)

// providerRequiresBaseURL indicates whether a built-in provider interface requires a base URL.
var providerRequiresBaseURL = map[string]bool{
	"amazon_bedrock": true,
	"anthropic":      false,
	"azure_openai":   true,
	"deepseek":       false,
	"gemini":         false,
	"groq":           false,
	"mistral":        false,
	"moonshotai":     false,
	"ollama":         true,
	"openai":         false,
	"plano":          true,
	"qwen":           true,
	"together_ai":    false,
	"xai":            false,
	"zhipu":          false,
}

// builtinEndpoint is the upstream endpoint for a provider that has a known base URL.
type builtinEndpoint struct {
	host     string
	port     int
	protocol string // "http" or "https"
}

var builtinEndpoints = map[string]builtinEndpoint{
	"anthropic":   {host: "api.anthropic.com", port: 443, protocol: "https"},
	"deepseek":    {host: "api.deepseek.com", port: 443, protocol: "https"},
	"gemini":      {host: "generativelanguage.googleapis.com", port: 443, protocol: "https"},
	"groq":        {host: "api.groq.com", port: 443, protocol: "https"},
	"mistral":     {host: "api.mistral.ai", port: 443, protocol: "https"},
	"moonshotai":  {host: "api.moonshot.ai", port: 443, protocol: "https"},
	"openai":      {host: "api.openai.com", port: 443, protocol: "https"},
	"together_ai": {host: "api.together.xyz", port: 443, protocol: "https"},
	"xai":         {host: "api.x.ai", port: 443, protocol: "https"},
	"zhipu":       {host: "open.bigmodel.cn", port: 443, protocol: "https"},
}

// NormalizedProvider is a provider with all fields resolved and validated.
type NormalizedProvider struct {
	AccessKey         string
	BaseURL           string
	BaseURLPathPrefix string
	ClusterName       string
	Default           bool
	EndpointHost      string
	EndpointPort      int
	EndpointProtocol  string // "http" or "https"
	Model             string
	Name              string
	PassthroughAuth   bool
	Provider          string
	ProviderInterface string
}

// GetClusterName returns the cluster name for routing purposes.
// If ClusterName is explicitly set, it uses that; otherwise it falls back
// to ProviderInterface.
func (p NormalizedProvider) GetClusterName() string {
	if p.ClusterName != "" {
		return p.ClusterName
	}
	return p.ProviderInterface
}

// hashSuffix returns the first 8 hex digits of the FNV-1a 32-bit hash of input.
// Matches the TypeScript implementation used for cluster name generation.
func hashSuffix(input string) string {
	h := fnv.New32a()
	h.Write([]byte(input))
	return fmt.Sprintf("%08x", h.Sum32())
}

func createClusterName(providerInterface, hostname string, port int, pathPrefix string) string {
	raw := fmt.Sprintf("%s_%s_%d", providerInterface, hostname, port)
	safe := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' {
			return r
		}
		return '_'
	}, raw)
	suffix := hashSuffix(fmt.Sprintf("%s:%d%s", hostname, port, pathPrefix))
	return fmt.Sprintf("%s_%s", safe, suffix)
}

func sanitizePathPrefix(pathname string) string {
	if pathname == "" || pathname == "/" {
		return ""
	}
	return strings.TrimSuffix(pathname, "/")
}

func normalizeProvider(input config.ProviderOptions) (NormalizedProvider, error) {
	provider := strings.ToLower(input.Provider)
	model := input.Model

	// Parse "provider/model" shorthand if provider field is empty.
	if provider == "" {
		parts := strings.SplitN(model, "/", 2)
		if len(parts) < 2 || parts[0] == "" || parts[1] == "" {
			return NormalizedProvider{}, fmt.Errorf(
				"provider is required for model %q — use the provider field or \"provider/model\" format", model)
		}
		provider = strings.ToLower(parts[0])
		model = parts[1]
	}

	providerInterface := input.ProviderInterface
	if providerInterface == "" {
		providerInterface = provider
	}

	requiresBase, known := providerRequiresBaseURL[providerInterface]
	if !known && input.BaseURL == "" {
		return NormalizedProvider{}, fmt.Errorf("custom provider %q must set baseUrl", provider)
	}
	if known && requiresBase && input.BaseURL == "" {
		return NormalizedProvider{}, fmt.Errorf("provider %q requires baseUrl", provider)
	}

	norm := NormalizedProvider{
		AccessKey:         input.APIKey,
		BaseURL:           input.BaseURL,
		Default:           input.Default,
		Model:             model,
		Name:              input.Name,
		PassthroughAuth:   input.PassthroughAuth,
		Provider:          provider,
		ProviderInterface: providerInterface,
	}
	if norm.Name == "" {
		norm.Name = fmt.Sprintf("%s/%s", provider, model)
	}

	if input.BaseURL != "" {
		u, err := url.Parse(input.BaseURL)
		if err != nil {
			return NormalizedProvider{}, fmt.Errorf("invalid baseUrl for %q: %w", provider, err)
		}
		if u.Scheme != "http" && u.Scheme != "https" {
			return NormalizedProvider{}, fmt.Errorf("baseUrl for %q must use http or https", provider)
		}

		norm.EndpointHost = u.Hostname()
		norm.EndpointProtocol = u.Scheme

		if u.Port() == "" {
			if u.Scheme == "https" {
				norm.EndpointPort = 443
			} else {
				norm.EndpointPort = 80
			}
		} else {
			fmt.Sscanf(u.Port(), "%d", &norm.EndpointPort)
		}

		norm.BaseURLPathPrefix = sanitizePathPrefix(u.Path)
		norm.ClusterName = createClusterName(providerInterface, norm.EndpointHost, norm.EndpointPort, norm.BaseURLPathPrefix)
	}

	return norm, nil
}

// NormalizeProviders validates and normalizes the provider list.
func NormalizeProviders(inputs []config.ProviderOptions) ([]NormalizedProvider, error) {
	if len(inputs) == 0 {
		return nil, fmt.Errorf("at least one provider must be configured")
	}

	out := make([]NormalizedProvider, 0, len(inputs))
	seen := map[string]bool{}
	defaults := 0

	for _, in := range inputs {
		norm, err := normalizeProvider(in)
		if err != nil {
			return nil, err
		}
		if seen[norm.Name] {
			return nil, fmt.Errorf("provider name %q must be unique", norm.Name)
		}
		seen[norm.Name] = true
		if norm.Default {
			defaults++
		}
		out = append(out, norm)
	}

	if defaults > 1 {
		return nil, fmt.Errorf("only one provider can be marked as default")
	}
	return out, nil
}

// NormalizeModelAliases normalizes the model aliases map.
func NormalizeModelAliases(aliases map[string]config.ModelAlias) map[string]string {
	result := make(map[string]string, len(aliases))
	for k, v := range aliases {
		result[k] = v.Target
	}
	return result
}
