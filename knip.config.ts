const config = {
  // react: referenced by the root tsconfig jsxImportSource, declared by the workspaces that use it.
  ignoreDependencies: ['@secretlint/secretlint-rule-preset-recommend', 'react'],
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
    },
    'packages/plugins/kit': {
      project: ['src/**/*.{ts,tsx}'],
    },
  },
};

export default config;
