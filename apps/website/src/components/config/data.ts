import type {
  ProxyLogLevel,
  ProxyProviderInterface,
  ProxyProviderOptions,
} from "@proxy-up/proxy/browser";

import type { ProviderMeta, ProviderPreset } from "./types";

export interface LogLevelOption {
  description: string;
  label: string;
  value: ProxyLogLevel;
}

export interface QuickProviderPreset {
  create: (index: number) => ProxyProviderOptions;
  description: string;
  label: string;
}

export const PROVIDER_LIBRARY: ProviderMeta[] = [
  {
    label: "OpenAI",
    modelExample: "gpt-4.1-mini",
    note: "Built-in OpenAI endpoint with API key auth.",
    provider: "openai",
    providerInterface: "openai",
    requiresBaseUrl: false,
  },
  {
    label: "Anthropic",
    modelExample: "claude-3-7-sonnet-latest",
    note: "Native Anthropic interface with a built-in upstream.",
    provider: "anthropic",
    providerInterface: "anthropic",
    requiresBaseUrl: false,
  },
  {
    label: "Gemini",
    modelExample: "gemini-2.0-flash",
    note: "Google Gemini through the built-in public endpoint.",
    provider: "gemini",
    providerInterface: "gemini",
    requiresBaseUrl: false,
  },
  {
    baseUrlExample: "https://your-resource.openai.azure.com/openai/deployments/your-deployment",
    label: "Azure OpenAI",
    modelExample: "gpt-4.1",
    note: "Requires an Azure deployment base URL.",
    provider: "azure_openai",
    providerInterface: "azure_openai",
    requiresBaseUrl: true,
  },
  {
    label: "Groq",
    modelExample: "llama-3.3-70b-versatile",
    note: "Fast built-in endpoint for Groq-hosted models.",
    provider: "groq",
    providerInterface: "groq",
    requiresBaseUrl: false,
  },
  {
    label: "Mistral",
    modelExample: "mistral-large-latest",
    note: "Mistral public endpoint, ready with just an API key.",
    provider: "mistral",
    providerInterface: "mistral",
    requiresBaseUrl: false,
  },
  {
    label: "DeepSeek",
    modelExample: "deepseek-chat",
    note: "Built-in routing for DeepSeek's hosted API.",
    provider: "deepseek",
    providerInterface: "deepseek",
    requiresBaseUrl: false,
  },
  {
    label: "Together AI",
    modelExample: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    note: "Together AI via the built-in upstream route.",
    provider: "together_ai",
    providerInterface: "together_ai",
    requiresBaseUrl: false,
  },
  {
    label: "xAI",
    modelExample: "grok-3-mini",
    note: "Use xAI's API without defining a custom base URL.",
    provider: "xai",
    providerInterface: "xai",
    requiresBaseUrl: false,
  },
  {
    label: "Zhipu",
    modelExample: "glm-4.5",
    note: "Built-in access to Zhipu's hosted endpoint.",
    provider: "zhipu",
    providerInterface: "zhipu",
    requiresBaseUrl: false,
  },
  {
    baseUrlExample: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    label: "Qwen",
    modelExample: "qwen-max",
    note: "Requires an explicit DashScope-compatible base URL.",
    provider: "qwen",
    providerInterface: "qwen",
    requiresBaseUrl: true,
  },
  {
    baseUrlExample: "http://127.0.0.1:11434/v1",
    label: "Ollama",
    modelExample: "llama3.2",
    note: "Local model serving over an OpenAI-compatible Ollama endpoint.",
    provider: "ollama",
    providerInterface: "ollama",
    requiresBaseUrl: true,
  },
  {
    baseUrlExample: "https://bedrock-runtime.us-east-1.amazonaws.com",
    label: "Amazon Bedrock",
    modelExample: "anthropic.claude-3-7-sonnet-20250219-v1:0",
    note: "Requires a regional Bedrock runtime base URL.",
    provider: "amazon_bedrock",
    providerInterface: "amazon_bedrock",
    requiresBaseUrl: true,
  },
  {
    baseUrlExample: "http://127.0.0.1:8787",
    label: "Plano",
    modelExample: "plano/default",
    note: "Self-hosted Plano runtime with a custom base URL.",
    provider: "plano",
    providerInterface: "plano",
    requiresBaseUrl: true,
  },
  {
    label: "MoonshotAI",
    modelExample: "moonshot-v1-128k",
    note: "MoonshotAI public API with built-in routing.",
    provider: "moonshotai",
    providerInterface: "moonshotai",
    requiresBaseUrl: false,
  },
];

export const LOG_LEVEL_OPTIONS: LogLevelOption[] = [
  {
    description: "Everything, including very chatty transport traces.",
    label: "Trace",
    value: "trace",
  },
  {
    description: "Operational debugging with request-level detail.",
    label: "Debug",
    value: "debug",
  },
  { description: "Useful day-to-day runtime events.", label: "Info", value: "info" },
  { description: "Only suspicious conditions and warnings.", label: "Warn", value: "warn" },
  { description: "Only failures that need immediate action.", label: "Error", value: "error" },
];

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    label: "OpenAI",
    providerInterface: "openai",
    baseUrl: "https://api.openai.com/v1",
    modelExample: "gpt-5.4",
  },
  {
    label: "Anthropic",
    providerInterface: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    modelExample: "claude-4-6-opus-latest",
  },
  {
    label: "火山引擎 Coding Plan",
    providerInterface: "anthropic",
    baseUrl: "https://ark.cn-beijing.volces.com/api/coding/v1",
    modelExample: "kimi-k2.5",
  },
];

export function getProviderMeta(providerInterface?: ProxyProviderInterface) {
  return PROVIDER_LIBRARY.find((option) => option.providerInterface === providerInterface);
}

export function createProviderPreset(
  providerInterface: ProxyProviderInterface,
  index: number,
): ProxyProviderOptions {
  const meta = getProviderMeta(providerInterface);

  if (!meta) {
    return {
      default: index === 0,
      model: "your-model-id",
      name: `Provider ${index + 1}`,
      provider: providerInterface,
      providerInterface,
    };
  }

  return {
    baseUrl: meta.requiresBaseUrl ? meta.baseUrlExample : undefined,
    default: index === 0,
    model: meta.modelExample,
    name: `${meta.label} ${index + 1}`,
    provider: meta.provider,
    providerInterface,
  };
}

export const QUICK_PROVIDER_PRESETS: QuickProviderPreset[] = [
  {
    create: (index) => createProviderPreset("openai", index),
    description: "Hosted OpenAI routing with a built-in endpoint.",
    label: "OpenAI",
  },
  {
    create: (index) => createProviderPreset("anthropic", index),
    description: "Claude-style native routing with minimal setup.",
    label: "Anthropic",
  },
  {
    create: (index) => createProviderPreset("ollama", index),
    description: "Local OpenAI-compatible models on `localhost`.",
    label: "Ollama",
  },
  {
    create: (index) => ({
      baseUrl: "https://your-endpoint.example/v1",
      default: index === 0,
      model: "your-model-id",
      name: `Compatible ${index + 1}`,
      provider: "compatible",
      providerInterface: "openai",
    }),
    description: "Custom OpenAI-compatible upstream with your own base URL.",
    label: "Compatible",
  },
];
