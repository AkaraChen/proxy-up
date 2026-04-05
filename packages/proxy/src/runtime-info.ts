import * as Config from "effect/Config";
import { Context, Effect, Layer, Option } from "effect";

type RuntimeArchitecture = NodeJS.Architecture | "unknown";
type RuntimePlatform = NodeJS.Platform | "unknown";

const resolveHomeDirectoryEffect = Effect.gen(function* () {
  const homeDirectory = yield* Config.option(Config.string("HOME"));

  if (Option.isSome(homeDirectory)) {
    return homeDirectory.value;
  }

  const userProfileDirectory = yield* Config.option(Config.string("USERPROFILE"));
  return Option.getOrElse(userProfileDirectory, () => ".");
});

const readProcessInfo = (): {
  readonly arch: RuntimeArchitecture;
  readonly platform: RuntimePlatform;
} => {
  if (typeof process === "undefined") {
    return {
      arch: "unknown",
      platform: "unknown",
    };
  }

  return {
    arch: process.arch,
    platform: process.platform,
  };
};

export class ProxyRuntimeInfo extends Context.Tag("@proxy-up/proxy/ProxyRuntimeInfo")<
  ProxyRuntimeInfo,
  {
    readonly arch: RuntimeArchitecture;
    readonly homeDirectory: string;
    readonly platform: RuntimePlatform;
  }
>() {
  static readonly Live = Layer.effect(
    ProxyRuntimeInfo,
    Effect.gen(function* () {
      const homeDirectory = yield* resolveHomeDirectoryEffect;
      const { arch, platform } = readProcessInfo();

      return {
        arch,
        homeDirectory,
        platform,
      };
    }),
  );
}

export const proxyRuntimeInfoSnapshot = Effect.runSync(
  Effect.gen(function* () {
    return yield* ProxyRuntimeInfo;
  }).pipe(Effect.provide(ProxyRuntimeInfo.Live)),
);
