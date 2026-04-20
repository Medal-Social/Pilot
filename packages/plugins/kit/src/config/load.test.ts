// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { KitError } from '../errors.js';
import { loadKitConfig } from './load.js';

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'kit-cfg-'));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('loadKitConfig', () => {
  it('loads config from $KIT_CONFIG path', async () => {
    const path = join(tmp, 'kit.config.json');
    writeFileSync(
      path,
      JSON.stringify({
        name: 'kit',
        repo: 'x',
        repoDir: '/tmp/k',
        machines: { foo: { type: 'darwin', user: 'a' } },
      })
    );
    const cfg = await loadKitConfig({ env: { KIT_CONFIG: path }, home: '/nope' });
    expect(cfg.name).toBe('kit');
  });

  it('falls back to ~/Documents/Code/kit/kit.config.json', async () => {
    const home = mkdtempSync(join(tmpdir(), 'kit-home-'));
    const dir = join(home, 'Documents', 'Code', 'kit');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'kit.config.json'),
      JSON.stringify({
        name: 'kit',
        repo: 'x',
        repoDir: '/tmp/k',
        machines: { foo: { type: 'darwin', user: 'a' } },
      })
    );
    const cfg = await loadKitConfig({ env: {}, home });
    expect(cfg.repoDir).toBe('/tmp/k');
    rmSync(home, { recursive: true, force: true });
  });

  it('throws KIT_CONFIG_NOT_FOUND when nothing is found', async () => {
    await expect(loadKitConfig({ env: {}, home: tmp })).rejects.toBeInstanceOf(KitError);
  });

  it('derives repoDir from the config file location when not in the file', async () => {
    const path = join(tmp, 'kit.config.json');
    writeFileSync(
      path,
      JSON.stringify({
        name: 'kit',
        repo: 'x',
        machines: { foo: { type: 'darwin', user: 'a' } },
      })
    );
    const cfg = await loadKitConfig({ env: { KIT_CONFIG: path }, home: '/nope' });
    expect(cfg.repoDir).toBe(tmp);
  });

  it('respects an explicit repoDir override in the file', async () => {
    const path = join(tmp, 'kit.config.json');
    writeFileSync(
      path,
      JSON.stringify({
        name: 'kit',
        repo: 'x',
        repoDir: '/somewhere/else',
        machines: { foo: { type: 'darwin', user: 'a' } },
      })
    );
    const cfg = await loadKitConfig({ env: { KIT_CONFIG: path }, home: '/nope' });
    expect(cfg.repoDir).toBe('/somewhere/else');
  });
});
