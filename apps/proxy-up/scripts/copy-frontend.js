#!/usr/bin/env node
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "../../..");
const WEBSITE_DIST = resolve(ROOT_DIR, "apps/website/dist");
const PUBLIC_DIR = resolve(ROOT_DIR, "apps/proxy-up/public");

if (!existsSync(WEBSITE_DIST)) {
  console.error("Frontend not built. Run 'vp run website#build' first.");
  process.exit(1);
}

if (existsSync(PUBLIC_DIR)) {
  rmSync(PUBLIC_DIR, { recursive: true });
}

mkdirSync(PUBLIC_DIR, { recursive: true });
cpSync(WEBSITE_DIST, PUBLIC_DIR, { recursive: true });

console.log("Frontend assets copied to apps/proxy-up/public");
