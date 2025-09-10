// Local ESLint flat config for the demo package so Next.js can detect the Next plugin.
// This mirrors the root demo configuration but lives inside the package root,
// which Next's lint integration expects when performing plugin detection.
import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  // Next recommended + TypeScript support
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "dist/**",
    ],
  },
];

export default config;
