import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 100,
        branches: 95,
        functions: 100,
        lines: 100,
      },
      exclude: ['node_modules/**', 'dist/**', '**/types.ts', '**/*.d.ts', '**/bin/pilot.ts'],
    },
  },
});
