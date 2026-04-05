import type { CommandExecutor } from "@effect/platform";
import net from "node:net";

import { Effect, Scope } from "effect";
import { expect, test } from "vite-plus/test";

import {
  asError,
  assertPortAvailableEffect,
  closeScopeQuietlyEffect,
  findAvailablePortEffect,
  isManagedProcessRunningEffect,
} from "../src/utils";

test("asError wraps non-error values", () => {
  expect(asError("boom")).toMatchObject({
    message: "boom",
  });
});

test("findAvailablePortEffect returns a bindable port", async () => {
  const port = await Effect.runPromise(findAvailablePortEffect());

  await new Promise<void>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });
});

test("assertPortAvailableEffect fails when the requested port is occupied", async () => {
  const server = net.createServer();
  const occupiedPort = await new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        resolve(address.port);
        return;
      }
      reject(new Error("expected an ephemeral port"));
    });
  });

  try {
    await expect(
      Effect.runPromise(assertPortAvailableEffect(occupiedPort, "127.0.0.1", "test listener")),
    ).rejects.toThrow(/not available/i);
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
});

test("isManagedProcessRunningEffect falls back to false when the probe throws", async () => {
  const failingIsRunning = Effect.fail(
    new Error("probe failed"),
  ) as unknown as Effect.Effect<boolean>;

  await expect(
    Effect.runPromise(
      isManagedProcessRunningEffect({
        isRunning: failingIsRunning,
      } as unknown as CommandExecutor.Process),
    ),
  ).resolves.toBe(false);
});

test("closeScopeQuietlyEffect completes even if finalizers are absent", async () => {
  const scope = await Effect.runPromise(Scope.make());

  await expect(Effect.runPromise(closeScopeQuietlyEffect(scope))).resolves.toBeUndefined();
});
