import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
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

