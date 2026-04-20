// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalProvider } from '../provider/local.js';
import { renderStatus } from './status.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'st-'));
  mkdirSync(join(dir, '.git'));
  writeFileSync(join(dir, 'ali-pro.apps.json'), JSON.stringify({ casks: ['zed'], brews: [] }));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('renderStatus', () => {
  it('builds a StatusReport with apps count', async () => {
    const exec = {
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }),
      spawn: vi.fn(),
    };
    const report = await renderStatus({
      machine: 'ali-pro',
      kitRepoDir: dir,
      machineFile: join(dir, 'ali-pro.apps.json'),
      provider: new LocalProvider(),
      exec,
    });
    expect(report.appsCount).toBe(1);
    expect(report.machineId).toBe('ali-pro');
  });

  it('omits org policy section when LocalProvider returns empty', async () => {
    const exec = {
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }),
      spawn: vi.fn(),
    };
    const report = await renderStatus({
      machine: 'ali-pro',
      kitRepoDir: dir,
      machineFile: join(dir, 'ali-pro.apps.json'),
      provider: new LocalProvider(),
      exec,
    });
    expect(report.orgPolicy).toBeUndefined();
  });
});
