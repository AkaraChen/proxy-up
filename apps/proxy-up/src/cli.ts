#!/usr/bin/env node
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import serverApp from "@proxy-up/server";
import open from "open";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3000;

const app = new Hono();

// Mount server API routes under /api
app.route("/api", serverApp);

// Mount static files from frontend build
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
  } catch {
    return c.text("Frontend not built. Run 'pnpm run build' first.", 500);
  }
});

const server = serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`✨ Proxy Up is running at http://localhost:${PORT}`);

// Open browser
setTimeout(() => {
  open(`http://localhost:${PORT}`).catch((err) => {
    console.warn("Could not open browser:", err.message);
  });
}, 1000);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down...");
  server.close();
  process.exit(0);
});
