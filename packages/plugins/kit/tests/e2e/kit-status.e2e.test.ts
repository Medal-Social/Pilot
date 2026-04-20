// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderStatus } from '../../src/commands/status.js';
import { LocalProvider } from '../../src/provider/local.js';

const here = fileURLToPath(new URL('.', import.meta.url));

let workdir: string;

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), 'kit-e2e-'));
  cpSync(join(here, 'fixtures', 'sample-kit'), workdir, { recursive: true });
});
afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

describe('kit status (e2e)', () => {
  it('produces a StatusReport against the fixture', async () => {
    const exec = {
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }),
      spawn: vi.fn(),
    };
    const report = await renderStatus({
      machine: 'test-mac',
      kitRepoDir: workdir,
      machineFile: join(workdir, 'machines', 'test-mac.apps.json'),
      provider: new LocalProvider(),
      exec,
    });
    expect(report.machineId).toBe('test-mac');
    expect(report.appsCount).toBe(1);
    expect(report.orgPolicy).toBeUndefined();
  });
});
