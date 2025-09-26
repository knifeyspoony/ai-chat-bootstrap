import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    {
      name: 'vitest-css-stub',
      enforce: 'pre',
      load(id) {
        if (id.includes('.css')) {
          return 'export default {}';
        }
        return null;
      },
    },
  ],
  resolve: {
    alias: {
      lib: path.resolve(__dirname, 'lib'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: ['lib/**/*.ts'],
      exclude: [
        'lib/components/**',
        'lib/**/*.tsx',
        'lib/tailwind.plugin.mjs',
      ],
    },
  },
});
