// Library specific ESLint configuration (React/TS without Next.js structure expectations)
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

const [recommendedTs, ...restTs] = tseslint.configs.recommended;

export default [
  // Apply base TS recommended to library files
  {
    ...recommendedTs,
    files: ["packages/ai-chat-bootstrap/**/*.{ts,tsx,cts,mts}"],
  },
  ...restTs.map((cfg) => ({
    ...cfg,
    files: ["packages/ai-chat-bootstrap/**/*.{ts,tsx,cts,mts}"],
  })),
  // Additional JS/TS (including .jsx) adjustments
  {
    files: ["packages/ai-chat-bootstrap/**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "@next/next": nextPlugin,
    },
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
      // React hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Allow pragmatic use of any in implementation files (still flagged in types/ below)
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Keep stricter typing in shared public type definitions
  {
    files: [
      "packages/ai-chat-bootstrap/lib/types/**/*.{ts,tsx}",
      "packages/ai-chat-bootstrap/lib/utils/**/*.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];
