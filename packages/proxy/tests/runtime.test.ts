import { expect, test } from "vite-plus/test";

import { findAvailablePort } from "../src";

test("findAvailablePort returns unique ports across repeated calls", async () => {
  const ports = await Promise.all(Array.from({ length: 10 }, () => findAvailablePort()));

  expect(new Set(ports).size).toBe(ports.length);
});
