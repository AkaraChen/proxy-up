#!/usr/bin/env node
import { ensureProxyArtifacts } from "@proxy-up/proxy";

console.log("⬇️  Downloading Proxy Up binaries...\n");

async function main() {
  try {
    const artifacts = await ensureProxyArtifacts();
    console.log("✅ All binaries downloaded successfully:\n");
    console.log(`   Brightstaff: ${artifacts.brightstaffPath}`);
    console.log(`   Envoy: ${artifacts.envoyPath}`);
    console.log(`   WASM: ${artifacts.llmGatewayWasmPath}`);
    console.log(`\n   Plano version: ${artifacts.planoVersion}`);
    console.log(`   Envoy version: ${artifacts.envoyVersion}`);
    console.log("\n🎉 Done! Binaries are cached in ~/.cache/proxy-up/proxy/");
  } catch (error) {
    console.error("\n❌ Failed to download binaries:");
    console.error(error);
    process.exit(1);
  }
}

void main();
