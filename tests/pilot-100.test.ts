import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

import {
  checkDocsDrift,
  checkLedger,
  checkPackageMetadata,
  checkPluginManifests,
  checkWorkflowGate,
  runPilot100,
} from '../scripts/pilot-100.mjs';

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(new URL('../scripts/pilot-100.mjs', import.meta.url));
const roots: string[] = [];

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function fixtureRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'pilot-100-'));
  roots.push(root);

  await mkdir(join(root, 'packages/cli'), { recursive: true });
  await mkdir(join(root, 'packages/plugins/kit'), { recursive: true });
  await mkdir(join(root, 'workers/pilot-landing'), { recursive: true });
  await mkdir(join(root, 'docs/quality'), { recursive: true });
  await mkdir(join(root, 'docs'), { recursive: true });
  await mkdir(join(root, '.github/workflows'), { recursive: true });

  await writeFile(
    rootFile(root, 'pnpm-workspace.yaml'),
    'packages:\n  - "packages/*"\n  - "packages/plugins/*"\n'
  );
  await writeJson(rootFile(root, 'package.json'), {
    scripts: { 'quality:100': 'node scripts/pilot-100.mjs' },
  });
  await writeJson(rootFile(root, 'packages/cli/package.json'), {
    name: '@medalsocial/pilot',
    type: 'module',
    exports: { '.': './dist/index.js', './package.json': './package.json' },
    files: ['dist', 'README.md', 'LICENSE'],
    scripts: { test: 'vitest', typecheck: 'tsc --noEmit -p tsconfig.json' },
  });
  await writeJson(rootFile(root, 'packages/plugins/kit/package.json'), {
    name: '@medalsocial/kit',
    type: 'module',
    main: 'dist/index.js',
    exports: { '.': './dist/index.js', './package.json': './package.json' },
    files: ['dist', 'plugin.toml', 'README.md', 'LICENSE'],
    scripts: { test: 'vitest', typecheck: 'tsc --noEmit -p tsconfig.json' },
  });
  await writeFile(
    rootFile(root, 'packages/plugins/kit/plugin.toml'),
    'name = "kit"\nnamespace = "medalsocial"\ndescription = "Machine config"\n'
  );
  await writeFile(
    rootFile(root, 'README.md'),
    'packages/cli\npackages/plugins/kit\nworkers/pilot-landing\nquality:100\n'
  );
  await writeFile(
    rootFile(root, 'CONTRIBUTING.md'),
    'packages/cli\npackages/plugins/kit\nworkers/pilot-landing\nquality:100\n'
  );
  await writeFile(
    rootFile(root, 'docs/ARCHITECTURE.md'),
    'packages/cli\npackages/plugins/kit\nworkers/pilot-landing\n'
  );
  await writeFile(rootFile(root, 'docs/WORKFLOWS.md'), 'dev\nprod\nPilot 100\n');
  await writeFile(
    rootFile(root, 'docs/quality/pilot-100.md'),
    [
      '# Pilot 100 Quality Ledger',
      '',
      '## Findings',
      '',
      '| ID | Surface | Finding | Decision | Status | Verification | Sunset |',
      '|---|---|---|---|---|---|---|',
      '| P100-001 | docs | Docs drift. | Update docs. | fixed | node scripts/pilot-100.mjs | Before PR merge |',
      '| P100-003 | worker | Worker outside workspace. | Keep explicit. | accepted-exclusion | documented skip | 2026-06-07 |',
      '',
    ].join('\n')
  );
  await writeFile(
    rootFile(root, '.github/workflows/ci.yml'),
    'jobs:\n  pilot-100:\n    steps:\n      - run: pnpm quality:100\n'
  );
  await writeFile(
    rootFile(root, '.github/workflows/release.yml'),
    'jobs:\n  release:\n    steps:\n      - run: pnpm quality:100\n'
  );

  return root;
}

function rootFile(root: string, path: string): string {
  return join(root, path);
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('checkLedger', () => {
  it('accepts fixed and justified rows with verification and sunset', async () => {
    const root = await fixtureRepo();

    expect(await checkLedger(root)).toEqual([]);
  });

  it('ignores non-findings tables in the ledger', async () => {
    const root = await fixtureRepo();
    const ledger = rootFile(root, 'docs/quality/pilot-100.md');
    const text = await readFile(ledger, 'utf8');
    await writeFile(
      ledger,
      [
        '# Pilot 100 Quality Ledger',
        '',
        '## Status Keys',
        '',
        '| Status | Meaning |',
        '|---|---|',
        '| `open` | Finding is real. |',
        '',
        text,
      ].join('\n')
    );

    expect(await checkLedger(root)).toEqual([]);
  });

  it('rejects accepted exclusions without a sunset', async () => {
    const root = await fixtureRepo();
    const ledger = rootFile(root, 'docs/quality/pilot-100.md');
    const text = await readFile(ledger, 'utf8');
    await writeFile(ledger, text.replace('2026-06-07', ' '));

    expect(await checkLedger(root)).toContainEqual(
      expect.objectContaining({ code: 'ledger-accepted-exclusion-incomplete' })
    );
  });

  it('rejects unknown statuses', async () => {
    const root = await fixtureRepo();
    const ledger = rootFile(root, 'docs/quality/pilot-100.md');
    const text = await readFile(ledger, 'utf8');
    await writeFile(ledger, text.replace('| fixed |', '| pending |'));

    expect(await checkLedger(root)).toContainEqual(
      expect.objectContaining({ code: 'ledger-invalid-status' })
    );
  });

  it('rejects open findings', async () => {
    const root = await fixtureRepo();
    const ledger = rootFile(root, 'docs/quality/pilot-100.md');
    const text = await readFile(ledger, 'utf8');
    await writeFile(ledger, text.replace('| fixed |', '| open |'));

    expect(await checkLedger(root)).toContainEqual(
      expect.objectContaining({ code: 'ledger-open-finding' })
    );
  });
});

describe('checkPluginManifests', () => {
  it('requires every plugin package to ship plugin.toml', async () => {
    const root = await fixtureRepo();
    await rm(rootFile(root, 'packages/plugins/kit/plugin.toml'));

    expect(await checkPluginManifests(root)).toContainEqual(
      expect.objectContaining({ code: 'plugin-manifest-missing' })
    );
  });
});

describe('checkPackageMetadata', () => {
  it('requires quality:100 at the root', async () => {
    const root = await fixtureRepo();
    await writeJson(rootFile(root, 'package.json'), { scripts: {} });

    expect(await checkPackageMetadata(root)).toContainEqual(
      expect.objectContaining({ code: 'package-root-quality-missing' })
    );
  });

  it('requires package tests and exported package entrypoints', async () => {
    const root = await fixtureRepo();
    await writeJson(rootFile(root, 'packages/cli/package.json'), {
      name: '@medalsocial/pilot',
      files: [],
      scripts: {},
    });

    expect(await checkPackageMetadata(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'package-test-missing' }),
        expect.objectContaining({ code: 'package-typecheck-missing' }),
        expect.objectContaining({ code: 'package-exports-missing' }),
        expect.objectContaining({ code: 'package-files-missing' }),
      ])
    );
  });
});

describe('checkDocsDrift', () => {
  it('flags stale package claims in docs', async () => {
    const root = await fixtureRepo();
    await writeFile(rootFile(root, 'docs/ARCHITECTURE.md'), 'packages/plugins/sanity\n');

    expect(await checkDocsDrift(root)).toContainEqual(
      expect.objectContaining({ code: 'docs-stale-package-claim' })
    );
  });

  it('requires core quality docs to mention quality:100', async () => {
    const root = await fixtureRepo();
    await writeFile(rootFile(root, 'README.md'), 'packages/cli\npackages/plugins/kit\n');

    expect(await checkDocsDrift(root)).toContainEqual(
      expect.objectContaining({ code: 'docs-quality-command-missing' })
    );
  });
});

describe('checkWorkflowGate', () => {
  it('requires CI and release workflows to run quality:100', async () => {
    const root = await fixtureRepo();
    await writeFile(rootFile(root, '.github/workflows/release.yml'), 'jobs: {}\n');

    expect(await checkWorkflowGate(root)).toContainEqual(
      expect.objectContaining({ code: 'workflow-quality-gate-missing' })
    );
  });
});

describe('runPilot100', () => {
  it('returns all findings across checks', async () => {
    const root = await fixtureRepo();
    await rm(rootFile(root, 'packages/plugins/kit/plugin.toml'));

    const findings = await runPilot100(root);

    expect(findings).toContainEqual(expect.objectContaining({ code: 'plugin-manifest-missing' }));
  });

  it('executes the CLI verifier when Node receives a relative script path', async () => {
    const root = await fixtureRepo();
    await mkdir(rootFile(root, 'scripts'), { recursive: true });
    await copyFile(scriptPath, rootFile(root, 'scripts/pilot-100.mjs'));
    await rm(rootFile(root, 'packages/plugins/kit/plugin.toml'));

    await expect(
      execFileAsync(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          "process.argv[1] = 'scripts/pilot-100.mjs'; await import('./scripts/pilot-100.mjs');",
        ],
        { cwd: root }
      )
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('[plugin-manifest-missing]'),
    });
  });
});
