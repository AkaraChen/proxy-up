import { NodeContext, NodeHttpClient } from "@effect/platform-node";
import { Effect, Layer } from "effect";

import { ProxyRuntimeInfo } from "./runtime-info.js";

const ProxyPlatformLive = Layer.mergeAll(
  NodeContext.layer,
  NodeHttpClient.layerUndici,
  ProxyRuntimeInfo.Live,
);

export function runProxyEffect<A, E, R>(effect: Effect.Effect<A, E, R>) {
  return Effect.runPromise(
    effect.pipe(Effect.provide(ProxyPlatformLive), Effect.scoped) as Effect.Effect<A, E, never>,
  );
}
