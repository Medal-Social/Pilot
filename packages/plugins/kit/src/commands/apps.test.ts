// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { KitError } from '../errors.js';
import { addApp, listApps, removeApp } from './apps.js';

let dir: string;
let path: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'apps-cmd-'));
  path = join(dir, 'apps.json');
  writeFileSync(path, JSON.stringify({ casks: ['zed'], brews: [] }));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('apps command', () => {
  it('addApp inserts a new cask', async () => {
    await addApp(path, '1password');
    expect(listApps(path).casks).toEqual(['1password', 'zed']);
  });

  it('addApp throws KIT_APPS_DUPLICATE on duplicate (case-insensitive)', async () => {
    await expect(addApp(path, 'ZED')).rejects.toBeInstanceOf(KitError);
  });

  it('addApp throws KIT_APPS_INVALID_NAME on bad name', async () => {
    await expect(addApp(path, 'has space')).rejects.toBeInstanceOf(KitError);
  });

  it('removeApp removes a cask', async () => {
    await removeApp(path, 'zed');
    expect(listApps(path).casks).toEqual([]);
  });
});
