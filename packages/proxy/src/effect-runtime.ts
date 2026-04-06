import { NodeContext, NodeHttpClient } from "@effect/platform-node";
import { Effect, Layer, ManagedRuntime } from "effect";

import { ProxyRuntimeInfo } from "./runtime-info.js";

const ProxyPlatformLive = Layer.mergeAll(
  NodeContext.layer,
  NodeHttpClient.layerUndici,
  ProxyRuntimeInfo.Live,
);

/**
 * Managed runtime for the Proxy platform.
 * This handles Layer lifecycle (build/dispose) correctly.
 */
const runtime = ManagedRuntime.make(ProxyPlatformLive);

/**
 * Run an Effect with the Proxy platform layer provided.
 *
 * Uses ManagedRuntime to properly handle Layer lifecycle and error types.
 * Layer build errors (e.g., ConfigError) are thrown as exceptions.
 */
export function runProxyEffect<A, E, R>(effect: Effect.Effect<A, E, R>): Promise<A> {
  return runtime.runPromise(effect as Effect.Effect<A, E, never>);
}
