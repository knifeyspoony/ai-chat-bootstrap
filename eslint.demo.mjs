import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

// Next.js + TypeScript rules scoped to demo only
const demoNextConfigs = compat
  .extends("next/core-web-vitals", "next/typescript")
  .map((cfg) => {
    const settings = cfg.settings ?? {};
    const nextSettings = settings.next ?? {};

    return {
      ...cfg,
      files: ["packages/ai-chat-bootstrap-demo/**/*.{js,jsx,ts,tsx}"],
      settings: {
        ...settings,
        next: {
          ...nextSettings,
          rootDir: ["packages/ai-chat-bootstrap-demo"],
        },
      },
    };
  });

export default [
  ...demoNextConfigs,
  {
    files: ["packages/ai-chat-bootstrap-demo/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];
