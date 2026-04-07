import type { ProxyProviderInterface } from "../lib/proxy";

/**
 * UI 层面的 Provider 数据结构，支持多个 model
 * 与后端的 ProxyProviderOptions 不同，这个结构允许一个 provider 配置多个 model
 */
export interface UIProvider {
  /** 唯一标识符，使用 UUID */
  id: string;
  /** Provider 名称 */
  name: string;
  /** Provider 接口类型 */
  providerInterface?: ProxyProviderInterface;
  /** API 密钥 */
  apiKey?: string;
  /** 自定义基础 URL */
  baseUrl?: string;
  /** 多个 model 列表 */
  models: string[];
  /** 是否透传认证 */
  passthroughAuth?: boolean;
}

/**
 * UI 配置结构
 */
export interface UIConfig {
  providers: UIProvider[];
  ports?: {
    gateway?: number;
    internal?: number;
    brightstaff?: number;
    admin?: number;
  };
  gatewayHost?: string;
  logLevel?: "trace" | "debug" | "info" | "warn" | "error";
  modelAliases?: Record<string, string | { target: string }>;
  artifacts?: {
    planoVersion?: string;
    envoyVersion?: string;
    cacheDir?: string;
  };
  cleanupOnStop?: boolean;
  workDir?: string;
}

/**
 * 生成新的 UUID
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
