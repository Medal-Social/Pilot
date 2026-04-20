// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from 'vitest';
import { githubStep } from './github.js';

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
  env: { HOME: '/tmp', KIT_MACHINE: 'ali-pro' },
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
