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

// Copy token layers
const tokenFiles = ["tokens.css", "tokens.primitives.css", "tokens.dark.css"];

function copyTokenFile(file) {
  const input = join(packageRoot, "lib", file);
  const output = join(packageRoot, "dist", file);
  try {
    copyFileSync(input, output);
    console.log(`✅ ${file} copied`);
  } catch (e) {
    console.error(`❌ Failed to copy ${file}`, e.message);
    if (!isWatch) process.exit(1);
  }
}

console.log("Publishing token layers for ai-chat-bootstrap...");
tokenFiles.forEach(copyTokenFile);

// Also copy tailwind preset & plugin
const inputPreset = join(packageRoot, "lib", "tailwind.preset.mjs");
const outputPreset = join(packageRoot, "dist", "tailwind.preset.mjs");
const inputPlugin = join(packageRoot, "lib", "tailwind.plugin.mjs");
const outputPlugin = join(packageRoot, "dist", "tailwind.plugin.mjs");
function copyPreset() {
  try {
    copyFileSync(inputPreset, outputPreset);
    console.log("✅ tailwind.preset.mjs copied");
  } catch (e) {
    console.error("❌ Failed to copy tailwind.preset.mjs", e.message);
    if (!isWatch) process.exit(1);
  }
}
function copyPlugin() {
  try {
    copyFileSync(inputPlugin, outputPlugin);
    console.log("✅ tailwind.plugin.mjs copied");
  } catch (e) {
    console.error("❌ Failed to copy tailwind.plugin.mjs", e.message);
    if (!isWatch) process.exit(1);
  }
}
copyPreset();
copyPlugin();

// Build a minimal compiled CSS (no preflight) using Tailwind against our source.
// This yields ai-chat.css that consumers can import directly for zero-config.
console.log("Building ai-chat.css (Tailwind minimal layer)...");
// We run tailwind using npx (local dependency) with an inline config pointing at dist preset.
const buildInput = join(packageRoot, "scripts", "build-input.css");
const outFile = join(distDir, "ai-chat.css");
// Create a temporary config that mirrors tailwind.build.config.cjs but uses the built preset.
// Use ABSOLUTE glob because config resides in dist/ while sources are in ../lib
// Include css files in content so Tailwind watch restarts on token / hook changes
const contentGlob = join(
  packageRoot,
  "lib",
  "**/*.{ts,tsx,js,jsx,css}"
).replace(/\\/g, "/");
const cfg = `module.exports = {\n  presets: [require('./tailwind.preset.mjs').default],\n  corePlugins: { preflight: false },\n  content: ['${contentGlob}'],\n  theme: { extend: {} },\n  plugins: []\n}`;
console.log("[ai-chat-bootstrap] Tailwind content glob =>", contentGlob);
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
  tokenFiles.forEach((file) => {
    const input = join(packageRoot, "lib", file);
    watch(input, { persistent: true }, (eventType) => {
      if (eventType === "change") {
        console.log(`↻ ${file} changed; copying...`);
        copyTokenFile(file);
      }
    });
  });
  watch(inputPreset, { persistent: true }, (eventType) => {
    if (eventType === "change") {
      console.log("↻ tailwind.preset.mjs changed; copying...");
      copyPreset();
    }
  });
  watch(inputPlugin, { persistent: true }, (eventType) => {
    if (eventType === "change") {
      console.log("↻ tailwind.plugin.mjs changed; copying...");
      copyPlugin();
    }
  });

  // Additionally watch any other CSS under lib (component level). When changed, touch temp config to
  // nudge Tailwind (some editors may not trigger JIT if only variable values change).
  watch(
    join(packageRoot, "lib"),
    { recursive: true },
    (eventType, filename) => {
      if (!filename) return;
      if (filename.endsWith(".css") && !tokenFiles.includes(filename)) {
        console.log(
          `↻ CSS changed (${filename}); ensuring Tailwind rebuild...`
        );
        try {
          // Touch the temp config so Tailwind notices a mtime change if it missed file watch.
          writeFileSync(tempConfigPath, cfg);
        } catch {}
      }
    }
  );

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
