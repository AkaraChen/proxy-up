#!/usr/bin/env node
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import serverApp, { ensureDefaultConfig, stopProxyService } from "@proxy-up/server";
import open from "open";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3000;

const app = new Hono();

// Mount server API routes first (最高优先级)
app.route("/", serverApp);

// Mount static files for non-API routes
app.use(
  "/*",
  serveStatic({
    root: resolve(__dirname, "../public"),
    rewriteRequestPath: (path) => path,
  }),
);

// Fallback to index.html for SPA routing
app.notFound((c) => {
  const indexPath = resolve(__dirname, "../public/index.html");
  try {
    const indexHtml = readFileSync(indexPath, "utf-8");
    return c.html(indexHtml);
  } catch (error) {
    console.error(`Failed to read ${indexPath}:`, error);
    return c.text("Frontend not built or inaccessible. Check build and file permissions.", 500);
  }
});

// Ensure default config exists before starting server
ensureDefaultConfig()
  .then(() => {
    const server = serve({
      fetch: app.fetch,
      port: PORT,
    });

    console.log(`✨ Proxy Up is running at http://localhost:${PORT}`);

    // Wait for server to be ready before opening browser
    const waitForServer = async (maxAttempts = 10) => {
      for (let i = 0; i < maxAttempts; i++) {
        try {
          const response = await fetch(`http://localhost:${PORT}/healthz`);
          if (response.ok) return true;
        } catch {
          // Server not ready yet
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return false;
    };

    void waitForServer().then((ready) => {
      if (ready) {
        open(`http://localhost:${PORT}`).catch((err) => {
          console.warn("Could not open browser:", err.message);
        });
      } else {
        console.warn("Server did not become ready in time, skipping browser open");
      }
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n👋 Received ${signal}, shutting down...`);
      try {
        await stopProxyService(true);
        console.log("✅ Proxy service stopped");
      } catch (error) {
        console.error("⚠️ Error stopping proxy service:", error);
      }
      server.close(() => {
        console.log("✅ Server closed");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  })
  .catch((error: unknown) => {
    console.error("Failed to initialize config:", error);
    process.exit(1);
  });
