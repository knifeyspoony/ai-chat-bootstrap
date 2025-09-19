import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const docsNextConfigs = compat
  .extends("next/core-web-vitals", "next/typescript")
  .map((cfg) => {
    const settings = cfg.settings ?? {};
    const nextSettings = settings.next ?? {};

    return {
      ...cfg,
      files: ["packages/ai-chat-bootstrap-docs/**/*.{js,jsx,ts,tsx}"],
      ignores: ["packages/ai-chat-bootstrap-docs/public/_pagefind/**"],
      settings: {
        ...settings,
        next: {
          ...nextSettings,
          rootDir: ["packages/ai-chat-bootstrap-docs"],
        },
      },
    };
  });

export default [
  {
    ignores: ["packages/ai-chat-bootstrap-docs/public/_pagefind/**"],
  },
  ...docsNextConfigs,
  {
    files: ["packages/ai-chat-bootstrap-docs/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];
