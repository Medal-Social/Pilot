import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 80,
        branches: 75,
      },
      exclude: ['node_modules/**', 'dist/**', '**/types.ts', '**/*.d.ts', '**/bin/pilot.ts'],
    },
  },
});
