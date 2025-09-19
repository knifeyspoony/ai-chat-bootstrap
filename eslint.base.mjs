// Base ESLint flat config fragments shared across all packages
export default [
  {
    ignores: [
      "node_modules/**",
      "**/node_modules/**",
      ".next/**",
      "**/.next/**",
      "out/**",
      "**/out/**",
      "build/**",
      "**/build/**",
      "next-env.d.ts",
      "**/next-env.d.ts",
      "dist/**",
      "**/dist/**",
      "public/**",
      "**/public/**",
    ],
  },
];
