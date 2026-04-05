import type { ProxyProviderOptions } from "@proxy-up/proxy/browser";
import type { UIProvider } from "./types";

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
