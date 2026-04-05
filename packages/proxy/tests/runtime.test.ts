import { expect, test } from "vite-plus/test";

import { findAvailablePort, startProxyGateway } from "../src";

test("findAvailablePort returns unique ports across repeated calls", async () => {
  const ports = await Promise.all(Array.from({ length: 10 }, () => findAvailablePort()));

  expect(new Set(ports).size).toBe(ports.length);
});

test("startProxyGateway returns a running gateway that can be stopped cleanly", async () => {
  const gatewayPort = await findAvailablePort();
  const internalPort = await findAvailablePort();
  const brightstaffPort = await findAvailablePort();
  const adminPort = await findAvailablePort();

  const gateway = await startProxyGateway({
    cleanupOnStop: true,
    providers: [
      {
        model: "openai/gpt-4.1-mini",
      },
    ],
    ports: {
      admin: adminPort,
      brightstaff: brightstaffPort,
      gateway: gatewayPort,
      internal: internalPort,
    },
  });

  expect(gateway.isRunning).toBe(true);
  expect(gateway.gatewayUrl).toMatch(/^http:\/\/127\.0\.0\.1:/);

  await gateway.stop();

  expect(gateway.isRunning).toBe(false);
}, 300_000);
