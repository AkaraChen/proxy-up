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
  await gateway.stop();

  expect(gateway.isRunning).toBe(false);
}, 300_000);

test("startProxyGateway exposes generated paths and keeps start/stop idempotent", async () => {
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

  expect(gateway.paths.workDir).toContain("proxy-up-gateway-");
  expect(gateway.paths.planoConfigPath).toContain("plano_config_rendered.yaml");
  expect(gateway.paths.envoyConfigPath).toContain("envoy.yaml");

  await gateway.start();
  await gateway.stop();
  await gateway.stop();
  expect(gateway.isRunning).toBe(false);
  await gateway.stop();
}, 300_000);
