import type { ProxyProviderOptions } from "@proxy-up/proxy/browser";
import type { UIProvider } from "./types";
import { generateUUID } from "./types";

/**
 * 将单个 UIProvider 展开为多个 ProxyProviderOptions
 * 每个 model 对应一个 ProxyProviderOptions
 */
export function expandUIProviderToOptions(uiProvider: UIProvider): ProxyProviderOptions[] {
  return uiProvider.models.map((model, index) => ({
    name: uiProvider.models.length === 1 ? uiProvider.name : `${uiProvider.name} (${model})`, // 多 model 时添加后缀保证唯一性
    providerInterface: uiProvider.providerInterface,
    apiKey: uiProvider.apiKey,
    baseUrl: uiProvider.baseUrl,
    model,
    default: uiProvider.defaultModel === index, // 只有指定 model index 的才是 default
    passthroughAuth: uiProvider.passthroughAuth,
  }));
}

/**
 * 将 UIProvider 数组转换为 ProxyProviderOptions 数组
 */
export function transformUIProvidersToOptions(uiProviders: UIProvider[]): ProxyProviderOptions[] {
  return uiProviders.flatMap(expandUIProviderToOptions);
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

    if (existingProvider) {
      // 添加 model 到现有 provider
      existingProvider.models.push(opt.model);
      if (opt.default) {
        existingProvider.defaultModel = existingProvider.models.length - 1;
      }
    } else {
      // 创建新 provider
      providerMap.set(key, {
        id: generateUUID(),
        name: baseName,
        providerInterface: opt.providerInterface,
        apiKey: opt.apiKey,
        baseUrl: opt.baseUrl,
        models: [opt.model],
        defaultModel: opt.default ? 0 : undefined,
        passthroughAuth: opt.passthroughAuth,
      });
    }
  }

  return Array.from(providerMap.values());
}
