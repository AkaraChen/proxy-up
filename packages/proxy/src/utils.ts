import { CommandExecutor } from "@effect/platform";
import { Effect, Exit, Scope } from "effect";
import getPort, { clearLockedPorts } from "get-port";

import { DEFAULT_INTERNAL_HOST } from "./constants.js";

export interface ManagedProcessLike {
  readonly isRunning: Effect.Effect<boolean>;
  readonly scope: Scope.CloseableScope;
}

export const asError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

export const findAvailablePortEffect = (host = DEFAULT_INTERNAL_HOST, port?: number) =>
  Effect.tryPromise({
    try: () => getPort({ host, port }),
    catch: asError,
  });

export const assertPortAvailableEffect = (port: number, host: string, label: string) =>
  Effect.gen(function* () {
    yield* Effect.sync(() => {
      clearLockedPorts();
    });
    const resolvedPort = yield* findAvailablePortEffect(host, port);

    if (resolvedPort !== port) {
      return yield* Effect.fail(
        new Error(`Port ${port} for ${label} is not available on ${host}.`),
      );
    }
  });

export const closeScopeQuietlyEffect = (scope: Scope.CloseableScope) =>
  Scope.close(scope, Exit.void).pipe(Effect.catchAll(() => Effect.void));

export const isManagedProcessRunningEffect = (process?: CommandExecutor.Process) =>
  process
    ? process.isRunning.pipe(Effect.catchAll(() => Effect.succeed(false)))
    : Effect.succeed(false);

export type { CommandExecutor };
