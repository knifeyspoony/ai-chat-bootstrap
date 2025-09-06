import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

// Next.js + TypeScript rules scoped to demo only
const demoNextConfigs = compat
  .extends("next/core-web-vitals", "next/typescript")
  .map((cfg) => ({
    ...cfg,
    files: ["packages/ai-chat-bootstrap-demo/**/*.{js,jsx,ts,tsx}"],
  }));

export default [...demoNextConfigs];
