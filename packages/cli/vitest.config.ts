import { defineConfig } from 'vitest/config';
import rootConfig from '../../vitest.config.ts';

export default defineConfig({
  test: {
    ...rootConfig.test,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      ...rootConfig.test?.coverage,
      // The root config measures repository guardrails. Package runs must
      // measure CLI source while retaining the shared thresholds and exclusions.
      include: ['src/**/*.{ts,tsx}'],
    },
  },
});
