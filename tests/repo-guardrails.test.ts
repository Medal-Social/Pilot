import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..');

function read(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(read(relativePath)) as T;
}

describe('repo guardrails', () => {
  it('defines release and quality scripts at the root', () => {
    const pkg = readJson<{ scripts?: Record<string, string>; engines?: { node?: string } }>(
      'package.json'
    );

    expect(pkg.scripts).toMatchObject({
      preinstall: 'npx only-allow pnpm',
      typecheck: 'turbo typecheck',
      'test:repo': 'vitest run tests/',
      'test:repo:coverage': 'vitest run tests/ --coverage',
      quality: 'pnpm lint && pnpm typecheck && pnpm test:repo && pnpm test',
      changeset: 'changeset',
      version: 'changeset version',
      release: 'pnpm build && changeset publish',
      'knip:report': 'knip --reporter json --no-exit-code',
      'knip:check': 'knip',
    });
    expect(pkg.scripts?.['secret:scan']).toContain('secretlint');
    expect(pkg.scripts?.['secret:scan:staged']).toContain('secretlint');
    expect(pkg.scripts?.['quality:100']).toContain('pnpm test:repo:coverage');
    expect(pkg.scripts?.['quality:100']).toContain('pnpm test -- --run --coverage');
    expect(pkg.engines?.node).toBe('>=24.0.0 <25');
  });

  it('uses contributor hooks for lint-staged, commitlint, tests, and secret scanning', () => {
    expect(read('.husky/pre-commit')).toContain('pnpm lint-staged');
    expect(read('.husky/pre-commit')).toContain('pnpm secret:scan:staged');
    expect(read('.husky/commit-msg')).toContain('commitlint');
    expect(read('.husky/pre-push')).toContain('pnpm lint');
    expect(read('.husky/pre-push')).toContain('pnpm typecheck');
    expect(read('.husky/pre-push')).toContain('pnpm test:repo');
    expect(read('.husky/pre-push')).toContain('pnpm test -- --run');
  });

  it('configures CI for changesets, secret scanning, and knip', () => {
    expect(read('.github/workflows/ci.yml')).toContain('pnpm quality');
    expect(read('.github/workflows/ci.yml')).toContain('pnpm secret:scan');
    expect(read('.github/workflows/ci.yml')).toContain('pnpm knip:check');
    expect(read('.github/workflows/release.yml')).toContain('changesets/action');
    expect(read('.github/workflows/release.yml')).toContain('pnpm release');
  });

  it('keeps coverage gates within the accepted drift window', () => {
    const rootConfig = read('vitest.config.ts');
    const kitConfig = read('packages/plugins/kit/vitest.config.ts');

    for (const config of [rootConfig, kitConfig]) {
      expect(config).toContain('statements: 97');
      expect(config).toContain('functions: 97');
      expect(config).toContain('lines: 97');
    }

    expect(rootConfig).toContain('branches: 95');
    expect(kitConfig).toContain('branches: 90');
  });

  it('locks down publish surfaces for shipped packages', () => {
    const cliPkg = readJson<{
      exports?: Record<string, unknown>;
      files?: string[];
      publishConfig?: { access?: string; provenance?: boolean };
    }>('packages/cli/package.json');
    const kitPkg = readJson<{
      private?: boolean;
      exports?: Record<string, unknown>;
      files?: string[];
    }>('packages/plugins/kit/package.json');

    // CLI is the only published package
    expect(cliPkg.exports).toBeDefined();
    expect(cliPkg.files).toEqual(
      expect.arrayContaining(['dist', 'README.md', 'LICENSE', '!dist/**/*.test.*'])
    );

    // kit is an internal plugin — must not be published
    expect(kitPkg.private).toBe(true);
    expect(kitPkg.exports).toEqual({
      '.': './dist/index.js',
      './package.json': './package.json',
    });
    expect(kitPkg.files).toEqual(
      expect.arrayContaining(['dist', 'plugin.toml', 'README.md', 'LICENSE', '!dist/**/*.test.*'])
    );
  });
});
