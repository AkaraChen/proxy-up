import type { ProxyProviderInterface, ProxyProviderOptions } from "@proxy-up/proxy/browser";
import type { UIProvider } from "./types";
import { generateUUID } from "./types";

/**
 * ProviderInterface 到 Provider 名称的映射表
 * 这个映射表用于将前端的 providerInterface 转换为后端需要的 provider 字段
 */
const PROVIDER_INTERFACE_TO_PROVIDER: Record<ProxyProviderInterface, string> = {
  openai: "openai",
  anthropic: "anthropic",
  gemini: "gemini",
  azure_openai: "azure_openai",
  groq: "groq",
  mistral: "mistral",
  deepseek: "deepseek",
  together_ai: "together_ai",
  xai: "xai",
  zhipu: "zhipu",
  qwen: "qwen",
  ollama: "ollama",
  amazon_bedrock: "amazon_bedrock",
  plano: "plano",
  moonshotai: "moonshotai",
};

/**
 * 将单个 UIProvider 展开为多个 ProxyProviderOptions
 * 每个 model 对应一个 ProxyProviderOptions
 */
export function expandUIProviderToOptions(uiProvider: UIProvider): ProxyProviderOptions[] {
  const providerInterface = uiProvider.providerInterface;
  const provider = providerInterface
    ? PROVIDER_INTERFACE_TO_PROVIDER[providerInterface]
    : undefined;

  return uiProvider.models.map((model) => {
    // 如果 model 不包含 "/" 且有 provider，则自动添加 provider 前缀
    const transformedModel = provider && !model.includes("/") ? `${provider}/${model}` : model;

    return {
      name: uiProvider.models.length === 1 ? uiProvider.name : `${uiProvider.name} (${model})`, // 显示原始 model 名，不显示带前缀的
      providerInterface,
      apiKey: uiProvider.apiKey,
      baseUrl: uiProvider.baseUrl,
      model: transformedModel, // 传给后端的 model 包含 provider 前缀
      passthroughAuth: uiProvider.passthroughAuth,
    };
  });
}

/**
 * 将 UIProvider 数组转换为 ProxyProviderOptions 数组
 */
export function transformUIProvidersToOptions(uiProviders: UIProvider[]): ProxyProviderOptions[] {
  return uiProviders.flatMap(expandUIProviderToOptions);
}

/**
 * 从 model 字符串中提取纯 model 名（去掉 provider 前缀）
 * 例如："moonshotai/kimi-k2.5" -> "kimi-k2.5"
 */
function extractPureModelName(model: string): string {
  // 如果 model 包含 "/"，提取后半部分作为纯 model 名
  const parts = model.split("/");
  return parts.length > 1 ? parts.slice(1).join("/") : model;
}

/**
 * 将 ProxyProviderOptions 数组转换为 UIProvider 数组
 * 通过共同属性分组，每个组成为一个 UIProvider
 */
export function transformOptionsToUIProviders(options: ProxyProviderOptions[]): UIProvider[] {
  const providerMap = new Map<string, UIProvider>();

  for (const opt of options) {
    // 提取基础名称（移除可能的模型后缀）
    const baseName = opt.name?.replace(/\s*\([^)]+\)$/, "") || opt.provider || "Unknown";

    // 使用共同属性创建分组键
    const key = [baseName, opt.providerInterface || "", opt.baseUrl || "", opt.apiKey || ""].join(
      "|",
    );

    const existingProvider = providerMap.get(key);

    // 提取纯 model 名（去掉 provider 前缀）
    const pureModelName = extractPureModelName(opt.model);

    if (existingProvider) {
      // 添加 model 到现有 provider（使用纯 model 名）
      existingProvider.models.push(pureModelName);
    } else {
      // 创建新 provider（使用纯 model 名）
      providerMap.set(key, {
        id: generateUUID(),
        name: baseName,
        providerInterface: opt.providerInterface,
        apiKey: opt.apiKey,
        baseUrl: opt.baseUrl,
        models: [pureModelName],
        passthroughAuth: opt.passthroughAuth,
      });
    }
  }

  return Array.from(providerMap.values());
}
