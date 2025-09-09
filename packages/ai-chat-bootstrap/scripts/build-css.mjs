#!/usr/bin/env node

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync, existsSync, copyFileSync, writeFileSync, watch } from "fs";
import { execSync, spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, "..");
const isWatch = process.argv.includes("--watch");

// Ensure dist directory exists
const distDir = join(packageRoot, "dist");
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Copy tokens.css into dist (no compiled utilities shipped)
const inputTokens = join(packageRoot, "lib", "tokens.css");
const outputTokens = join(packageRoot, "dist", "tokens.css");

function copyTokens() {
  try {
    copyFileSync(inputTokens, outputTokens);
    console.log("✅ tokens.css copied");
  } catch (e) {
    console.error("❌ Failed to copy tokens.css", e.message);
    if (!isWatch) process.exit(1);
  }
}

console.log("Publishing tokens.css for ai-chat-bootstrap...");
copyTokens();

// Also copy tailwind preset
const inputPreset = join(packageRoot, "lib", "tailwind.preset.mjs");
const outputPreset = join(packageRoot, "dist", "tailwind.preset.mjs");
function copyPreset() {
  try {
    copyFileSync(inputPreset, outputPreset);
    console.log("✅ tailwind.preset.mjs copied");
  } catch (e) {
    console.error("❌ Failed to copy tailwind.preset.mjs", e.message);
    if (!isWatch) process.exit(1);
  }
}
copyPreset();

// Build a minimal compiled CSS (no preflight) using Tailwind against our source.
// This yields ai-chat.css that consumers can import directly for zero-config.
console.log("Building ai-chat.css (Tailwind minimal layer)...");
// We run tailwind using npx (local dependency) with an inline config pointing at dist preset.
const buildInput = join(packageRoot, "scripts", "build-input.css");
const outFile = join(distDir, "ai-chat.css");
// Create a temporary config that mirrors tailwind.build.config.cjs but uses the built preset.
const cfg = `module.exports = {\n  presets: [require('./tailwind.preset.mjs').default],\n  corePlugins: { preflight: false },\n  content: ['./lib/**/*.{ts,tsx,js,jsx}'],\n  theme: { extend: {} },\n  plugins: []\n}`;
const tempConfigPath = join(distDir, "_temp.tailwind.config.cjs");
writeFileSync(tempConfigPath, cfg);

function buildOnce() {
  try {
    execSync(
      `npx tailwindcss -c ${tempConfigPath} -i ${buildInput} -o ${outFile} --no-autoprefixer`,
      { stdio: "inherit", cwd: packageRoot }
    );
    console.log("✅ ai-chat.css built");
  } catch (e) {
    console.error("❌ Failed to build ai-chat.css", e.message);
    if (!isWatch) process.exit(1);
  }
}

if (isWatch) {
  // Copy assets on change
  watch(inputTokens, { persistent: true }, (eventType) => {
    if (eventType === "change") {
      console.log("↻ tokens.css changed; copying...");
      copyTokens();
    }
  });
  watch(inputPreset, { persistent: true }, (eventType) => {
    if (eventType === "change") {
      console.log("↻ tailwind.preset.mjs changed; copying...");
      copyPreset();
    }
  });

  // Run tailwind in watch mode so CSS rebuilds when lib source changes
  const args = [
    "tailwindcss",
    "-c",
    tempConfigPath,
    "-i",
    buildInput,
    "-o",
    outFile,
    "--no-autoprefixer",
    "-w",
  ];
  const child = spawn("npx", args, {
    stdio: "inherit",
    cwd: packageRoot,
    shell: true,
  });

  const cleanUp = () => {
    try {
      child.kill();
    } catch {}
    process.exit(0);
  };
  process.on("SIGINT", cleanUp);
  process.on("SIGTERM", cleanUp);
} else {
  buildOnce();
}
