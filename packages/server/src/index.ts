import { Hono } from "hono";
import { cors } from "hono/cors";

import { saveCurrentConfig, loadCurrentConfig } from "./config-manager.js";
import {
  startProxyService,
  stopProxyService,
  restartProxyService,
  getProxyServiceStatus,
} from "./service-manager.js";
import type { ProxyConfig } from "./config-manager.js";

const app = new Hono();

app.use("*", cors());

// Health check
app.get("/", (c) => c.text("hello world"));

// Config management
app.get("/api/config", async (c) => {
  try {
    const config = await loadCurrentConfig();
    if (!config) {
      return c.json({ error: "No configuration found" }, 404);
    }
    return c.json(config);
  } catch {
    return c.json({ error: "Failed to load configuration" }, 500);
  }
});

app.post("/api/config", async (c) => {
  try {
    const config = await c.req.json<ProxyConfig>();
    const configPath = await saveCurrentConfig(config);
    return c.json({
      success: true,
      message: "Configuration saved to ~/.config/proxy-up/config.json",
      path: configPath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save configuration";
    return c.json({ error: message }, 500);
  }
});

app.put("/api/config", async (c) => {
  try {
    const config = await c.req.json<ProxyConfig>();
    const configPath = await saveCurrentConfig(config);
    return c.json({
      success: true,
      message: "Configuration updated",
      path: configPath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update configuration";
    return c.json({ error: message }, 500);
  }
});

// Service management - Status
app.get("/api/status", async (c) => {
  try {
    const status = await getProxyServiceStatus();
    return c.json(status);
  } catch {
    return c.json({ error: "Failed to get status" }, 500);
  }
});

// Service management - Start
app.post("/api/start", async (c) => {
  try {
    const config = await loadCurrentConfig();
    if (!config) {
      return c.json({ error: "No configuration found. Please save configuration first" }, 400);
    }

    const gateway = await startProxyService(config);
    return c.json({
      success: true,
      message: "Proxy started successfully",
      gatewayUrl: gateway.gatewayUrl,
      workDir: gateway.paths.workDir,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start proxy";
    return c.json({ error: message }, 500);
  }
});

// Service management - Stop
app.post("/api/stop", async (c) => {
  try {
    await stopProxyService(true);
    return c.json({ success: true, message: "Proxy stopped successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to stop proxy";
    return c.json({ error: message }, 500);
  }
});

// Service management - Restart
app.post("/api/restart", async (c) => {
  try {
    const config = await loadCurrentConfig();
    if (!config) {
      return c.json({ error: "No configuration found. Please save configuration first" }, 400);
    }

    const gateway = await restartProxyService(config);
    return c.json({
      success: true,
      message: "Proxy restarted successfully",
      gatewayUrl: gateway.gatewayUrl,
      workDir: gateway.paths.workDir,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to restart proxy";
    return c.json({ error: message }, 500);
  }
});

export { app };
export default app;
