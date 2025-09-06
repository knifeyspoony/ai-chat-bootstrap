#!/usr/bin/env node

import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync, existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, "..");

// Ensure dist directory exists
const distDir = join(packageRoot, "dist");
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Build CSS using Tailwind CSS CLI
const inputCSS = join(packageRoot, "lib", "styles.css");
const outputCSS = join(packageRoot, "dist", "styles.css");

console.log("Building CSS for ai-chat-bootstrap...");

try {
  execSync(`npx tailwindcss -i "${inputCSS}" -o "${outputCSS}" --minify`, {
    cwd: packageRoot,
    stdio: "inherit",
  });
  console.log("✅ CSS build complete");
} catch (error) {
  console.error("❌ CSS build failed:", error.message);
  process.exit(1);
}
