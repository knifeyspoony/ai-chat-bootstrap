import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./lib/index.ts", "./lib/server.ts"], // Entry points (client + server-only)
  format: ["esm", "cjs"], // Dual module format support
  dts: true, // Generate TypeScript declaration files
  outDir: "dist", // Output directory
  clean: false, // Don't clean - CSS build puts files in dist
  sourcemap: true, // Generate source maps for debugging
  platform: "neutral",
});
