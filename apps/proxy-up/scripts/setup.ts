#!/usr/bin/env node
import { ensureProxyArtifacts } from "@proxy-up/proxy";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, existsSync, cpSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "../../..");
const WEBSITE_DIR = resolve(ROOT_DIR, "apps/website");
const PROXY_UP_DIR = resolve(ROOT_DIR, "apps/proxy-up");
const PUBLIC_DIR = resolve(PROXY_UP_DIR, "public");

console.log("🚀 Setting up Proxy Up...\n");

async function main() {
  // Step 1: Build frontend
  console.log("📦 Step 1: Building frontend...");
  try {
    execSync("vp run website#build", {
      cwd: ROOT_DIR,
      stdio: "inherit",
    });
    console.log("✅ Frontend built successfully\n");
  } catch {
    console.error("❌ Failed to build frontend");
    process.exit(1);
  }

  // Step 2: Copy frontend assets
  console.log("📁 Step 2: Copying frontend assets...");
  const websiteDist = resolve(WEBSITE_DIR, "dist");

  // Remove old public directory
  if (existsSync(PUBLIC_DIR)) {
    rmSync(PUBLIC_DIR, { recursive: true });
  }

  // Create public directory
  mkdirSync(PUBLIC_DIR, { recursive: true });

  // Copy frontend build
  if (existsSync(websiteDist)) {
    cpSync(websiteDist, PUBLIC_DIR, { recursive: true });
    console.log(`✅ Frontend assets copied to ${PUBLIC_DIR}\n`);
  } else {
    console.error("❌ Frontend dist not found");
    process.exit(1);
  }

  // Step 3: Download binaries
  console.log("⬇️  Step 3: Downloading binaries...");
  try {
    const artifacts = await ensureProxyArtifacts();
    console.log("✅ Binaries downloaded successfully:");
    console.log(`   - brightstaff: ${artifacts.brightstaffPath}`);
    console.log(`   - envoy: ${artifacts.envoyPath}`);
    console.log(`   - llm_gateway.wasm: ${artifacts.llmGatewayWasmPath}`);
    console.log(`   - plano version: ${artifacts.planoVersion}`);
    console.log(`   - envoy version: ${artifacts.envoyVersion}\n`);
  } catch (error) {
    console.error("❌ Failed to download binaries:", error);
    process.exit(1);
  }

  console.log("🎉 Setup complete! You can now run 'pnpm start' to launch Proxy Up.");
}

void main().catch((error) => {
  console.error("Setup failed:", error);
  process.exit(1);
});
