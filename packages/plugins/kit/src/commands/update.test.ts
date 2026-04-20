// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalProvider } from '../provider/local.js';
import { runMigrations, runUpdate } from './update.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'upd-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('runUpdate', () => {
  it('pulls then rebuilds in order', async () => {
    const calls: string[] = [];
    const exec = {
      run: vi.fn().mockImplementation(async (cmd: string, args: string[]) => {
        calls.push([cmd, ...args].slice(0, 4).join(' '));
        return { stdout: '', stderr: '', code: 0 };
      }),
      spawn: vi.fn(),
    };
    await runUpdate({
      machine: 'ali-pro',
      machineType: 'darwin',
      kitRepoDir: dir,
      provider: new LocalProvider(),
      exec,
      sudoKeeper: { start: () => () => undefined },
    });
    const pullPos = calls.findIndex((c) => c.startsWith('git -C') && c.includes('pull'));
    const rebuildPos = calls.findIndex((c) => c.startsWith('sudo') && c.includes('darwin-rebuild'));
    expect(pullPos).toBeGreaterThan(-1);
    expect(rebuildPos).toBeGreaterThan(pullPos);
  });

  it('runs migrations against machines/ subdirectories', async () => {
    mkdirSync(join(dir, 'machines', 'personal'), { recursive: true });
    writeFileSync(
      join(dir, 'machines', 'personal', 'demo.nix'),
      `{ ... }: {
  homebrew.casks = [
    "zed"
  ];
  homebrew.brews = [
    "jq"
  ];
}
`
    );
    const changed = await runMigrations(dir);
    expect(changed).toBe(1);
    const apps = JSON.parse(
      readFileSync(join(dir, 'machines', 'personal', 'demo.apps.json'), 'utf8')
    );
    expect(apps.casks).toEqual(['zed']);
  });

  it('starts and stops the sudo keeper', async () => {
    const stop = vi.fn();
    const start = vi.fn().mockReturnValue(stop);
    const exec = {
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }),
      spawn: vi.fn(),
    };
    await runUpdate({
      machine: 'ali-pro',
      machineType: 'darwin',
      kitRepoDir: dir,
      provider: new LocalProvider(),
      exec,
      sudoKeeper: { start },
    });
    expect(start).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
  });
});
