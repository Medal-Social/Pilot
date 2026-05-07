import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 97,
        branches: 95,
        functions: 97,
        lines: 97,
      },
      exclude: ['node_modules/**', 'dist/**', '**/types.ts', '**/*.d.ts', '**/bin/pilot.ts'],
    },
  },
});
