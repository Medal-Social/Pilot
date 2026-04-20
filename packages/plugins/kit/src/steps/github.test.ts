// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { githubStep } from './github.js';

let home: string;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'gh-'));
});
afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

const ctxWith = (
  impl: (
    cmd: string,
    args: string[]
  ) => Promise<{
    stdout: string;
    stderr: string;
    code: number;
  }>
) => ({
  exec: { run: vi.fn(impl), spawn: vi.fn() },
  env: { HOME: home, KIT_MACHINE: 'ali-pro' },
});

describe('githubStep', () => {
  it('check returns true when ssh authenticates', async () => {
    const ctx = ctxWith(async (cmd) => {
      if (cmd === 'ssh')
        return { stdout: '', stderr: 'Hi! You have successfully authenticated', code: 1 };
      return { stdout: '', stderr: '', code: 0 };
    });
    expect(await githubStep.check(ctx)).toBe(true);
  });

  it('check returns false when ssh does not authenticate', async () => {
    const ctx = ctxWith(async () => ({
      stdout: '',
      stderr: 'permission denied',
      code: 255,
    }));
    expect(await githubStep.check(ctx)).toBe(false);
  });

  it('SSH probe always uses StrictHostKeyChecking=accept-new (works on fresh machines)', async () => {
    const ctx = ctxWith(async () => ({ stdout: '', stderr: '', code: 0 }));
    await githubStep.check(ctx);
    const sshCall = ctx.exec.run.mock.calls.find((c) => c[0] === 'ssh');
    expect(sshCall).toBeDefined();
    expect(sshCall?.[1]).toEqual(expect.arrayContaining(['StrictHostKeyChecking=accept-new']));
  });

  it('seeds known_hosts with github.com keys before SSH probe (when missing)', async () => {
    const ctx = ctxWith(async (cmd) => {
      if (cmd === 'ssh-keyscan')
        return { stdout: 'github.com ssh-ed25519 AAAA...\n', stderr: '', code: 0 };
      return { stdout: '', stderr: '', code: 0 };
    });
    await githubStep.check(ctx);
    const keyscanCall = ctx.exec.run.mock.calls.find((c) => c[0] === 'ssh-keyscan');
    expect(keyscanCall).toBeDefined();
    expect(keyscanCall?.[1]).toEqual(expect.arrayContaining(['github.com']));
  });

  it('run uploads SSH key when gh auth status succeeds and key not present', async () => {
    let sshCallCount = 0;
    const ctx = ctxWith(async (cmd, args) => {
      if (cmd === 'ssh') {
        sshCallCount++;
        if (sshCallCount === 1) return { stdout: '', stderr: 'permission denied', code: 255 };
        return { stdout: '', stderr: 'Hi! You have successfully authenticated', code: 1 };
      }
      if (cmd === 'gh' && args[0] === 'auth' && args[1] === 'status')
        return { stdout: '', stderr: '', code: 0 };
      if (cmd === 'gh' && args[0] === 'ssh-key' && args[1] === 'list')
        return { stdout: '', stderr: '', code: 0 };
      if (cmd === 'gh' && args[0] === 'ssh-key' && args[1] === 'add')
        return { stdout: '', stderr: '', code: 0 };
      if (cmd === 'cat') return { stdout: 'ssh-ed25519 AAAA fake', stderr: '', code: 0 };
      return { stdout: '', stderr: '', code: 0 };
    });
    await githubStep.run(ctx);
    expect(ctx.exec.run).toHaveBeenCalledWith('gh', expect.arrayContaining(['ssh-key', 'add']));
  });
});
