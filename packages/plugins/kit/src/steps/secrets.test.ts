// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { secretsStep } from './secrets.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sec-'));
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  writeFileSync(join(dir, 'scripts', 'secrets-init.sh'), '#!/bin/sh\nexit 0\n');
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('secretsStep', () => {
  it('check returns false (always runs idempotent script)', async () => {
    expect(
      await secretsStep.check({
        exec: { run: vi.fn(), spawn: vi.fn() },
        env: { KIT_REPO_DIR: dir },
      })
    ).toBe(false);
  });

  it('run shells out to bash secrets-init.sh detect MACHINE USER', async () => {
    const exec = {
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }),
      spawn: vi.fn(),
    };
    await secretsStep.run({
      exec,
      env: { KIT_REPO_DIR: dir, KIT_MACHINE: 'ali-pro', USER: 'ali' },
    });
    expect(exec.run).toHaveBeenCalledWith('bash', [
      join(dir, 'scripts', 'secrets-init.sh'),
      'detect',
      'ali-pro',
      'ali',
    ]);
  });

  it('run skips when secrets-init.sh missing', async () => {
    rmSync(join(dir, 'scripts', 'secrets-init.sh'));
    const exec = { run: vi.fn(), spawn: vi.fn() };
    await secretsStep.run({ exec, env: { KIT_REPO_DIR: dir, KIT_MACHINE: 'a', USER: 'b' } });
    expect(exec.run).not.toHaveBeenCalled();
  });
});
