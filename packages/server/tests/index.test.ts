import app from "../src/index";
import { expect, test, describe, beforeEach } from "vite-plus/test";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ProxyConfig } from "../src/config-manager";

const CONFIG_DIR = join(homedir(), ".config", "proxy-up");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const STATUS_FILE = join(CONFIG_DIR, "status.json");

async function cleanupConfigFiles() {
  try {
    await fs.unlink(CONFIG_FILE);
  } catch {}
  try {
    await fs.unlink(STATUS_FILE);
  } catch {}
}

describe("API endpoints", () => {
  beforeEach(async () => {
    await cleanupConfigFiles();
  });

  describe("Config management", () => {
    test("GET /api/config returns 404 when no config exists", async () => {
      const res = await app.request("/api/config");
      expect(res.status).toBe(404);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe("No configuration found");
    });

    test("POST /api/config saves configuration", async () => {
      const config: ProxyConfig = {
        providers: [
          {
            model: "openai/gpt-4",
            apiKey: "test-key",
            default: true,
          },
        ],
      };

      const res = await app.request("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as { success: boolean; path: string };
      expect(data.success).toBe(true);
      expect(data.path).toContain(".config/proxy-up/config.json");
    });

    test("GET /api/config returns saved configuration", async () => {
      // First save a config
      const config: ProxyConfig = {
        providers: [
          {
            model: "openai/gpt-4",
            apiKey: "test-key",
          },
        ],
      };

      await app.request("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      // Then retrieve it
      const res = await app.request("/api/config");
      expect(res.status).toBe(200);
      const loadedConfig = (await res.json()) as ProxyConfig;
      expect(loadedConfig.providers).toHaveLength(1);
      expect(loadedConfig.providers[0].model).toBe("openai/gpt-4");
    });

    test("PUT /api/config updates configuration", async () => {
      const config: ProxyConfig = {
        providers: [
          {
            model: "anthropic/claude-3",
            apiKey: "test-key-2",
          },
        ],
      };

      const res = await app.request("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as { success: boolean };
      expect(data.success).toBe(true);
    });
  });

  describe("Service management - Status", () => {
    test("GET /api/status returns running status", async () => {
      const res = await app.request("/api/status");
      expect(res.status).toBe(200);
      const status = (await res.json()) as { running: boolean };
      expect(status.running).toBeDefined();
    });
  });

  describe("Service management - Start/Stop/Restart", () => {
    test("POST /api/start returns error when no config exists", async () => {
      const res = await app.request("/api/start", { method: "POST" });
      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toContain("No configuration found");
    });

    test("POST /api/stop succeeds when no proxy is running", async () => {
      const res = await app.request("/api/stop", { method: "POST" });
      expect(res.status).toBe(200);
      const data = (await res.json()) as { success: boolean };
      expect(data.success).toBe(true);
    });

    test("POST /api/restart returns error when no config exists", async () => {
      const res = await app.request("/api/restart", { method: "POST" });
      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toContain("No configuration found");
    });
  });

  describe("Error handling", () => {
    test("POST /api/config with invalid JSON returns 500", async () => {
      const res = await app.request("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });

      expect(res.status).toBe(500);
    });

    test("GET /nonexistent returns 404", async () => {
      const res = await app.request("/nonexistent");
      expect(res.status).toBe(404);
    });
  });
});
