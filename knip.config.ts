const config = {
  ignoreDependencies: ['@secretlint/secretlint-rule-preset-recommend', 'secretlint'],
  ignoreBinaries: ['wrangler'],
  ignoreFiles: ['workers/pilot-landing/src/index.ts'],
  rules: {
    exports: 'warn',
    types: 'warn',
    unlisted: 'warn',
  },
  workspaces: {
    'packages/cli': {
      project: ['src/**/*.{ts,tsx}'],
      ignoreFiles: ['src/components/index.ts'],
      ignoreDependencies: ['ink-text-input'],
    },
    'packages/plugins/kit': {
      project: ['src/**/*.{ts,tsx}'],
    },
  },
};

export default config;
