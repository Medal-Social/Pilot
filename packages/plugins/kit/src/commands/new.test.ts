// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scaffoldKit } from './new.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'new-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('scaffoldKit', () => {
  it('writes the expected files into a fresh directory', async () => {
    const exec = {
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }),
      spawn: vi.fn(),
    };
    const target = join(dir, 'my-kit');
    await scaffoldKit({ target, name: 'my-kit', machine: 'my-mac', user: 'me', exec });
    expect(existsSync(join(target, 'kit.config.json'))).toBe(true);
    expect(existsSync(join(target, 'flake.nix'))).toBe(true);
    expect(existsSync(join(target, 'machines', 'my-mac.nix'))).toBe(true);
    expect(existsSync(join(target, 'machines', 'my-mac.apps.json'))).toBe(true);
    expect(existsSync(join(target, '.gitignore'))).toBe(true);
    const cfg = JSON.parse(readFileSync(join(target, 'kit.config.json'), 'utf8'));
    expect(cfg.machines['my-mac']).toEqual({ type: 'darwin', user: 'me' });
  });

  it('initializes git', async () => {
    const exec = {
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }),
      spawn: vi.fn(),
    };
    await scaffoldKit({ target: join(dir, 'k2'), name: 'k2', machine: 'm', user: 'u', exec });
    const gitInit = exec.run.mock.calls.find((c) => c[0] === 'git' && c[1][0] === 'init');
    expect(gitInit).toBeDefined();
  });
});
