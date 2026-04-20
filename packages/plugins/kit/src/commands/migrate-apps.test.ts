// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrateMachineFile } from './migrate-apps.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mig-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const INLINE = `{ ... }: {
  homebrew.casks = [
    "1password"
    "zed"
    "rectangle"
  ];
  homebrew.brews = [
    "ripgrep"
    "jq"
  ];
}
`;

describe('migrateMachineFile', () => {
  it('extracts inline lists into apps.json and rewrites the .nix', async () => {
    const nixPath = join(dir, 'ali-pro.nix');
    writeFileSync(nixPath, INLINE);
    const result = await migrateMachineFile(nixPath, 'ali-pro');
    expect(result.changed).toBe(true);
    const apps = JSON.parse(readFileSync(join(dir, 'ali-pro.apps.json'), 'utf8'));
    expect(apps.casks).toEqual(['1password', 'rectangle', 'zed']);
    expect(apps.brews).toEqual(['jq', 'ripgrep']);
    expect(readFileSync(nixPath, 'utf8')).toBe(
      `{ ... }: let\n  apps = builtins.fromJSON (builtins.readFile ./ali-pro.apps.json);\nin {\n  homebrew.casks = apps.casks;\n  homebrew.brews = apps.brews;\n}\n`
    );
  });

  it('is idempotent — re-running on a migrated file does nothing', async () => {
    const nixPath = join(dir, 'ali-pro.nix');
    writeFileSync(
      nixPath,
      `{ ... }: let\n  apps = builtins.fromJSON (builtins.readFile ./ali-pro.apps.json);\nin {\n  homebrew.casks = apps.casks;\n  homebrew.brews = apps.brews;\n}\n`
    );
    writeFileSync(join(dir, 'ali-pro.apps.json'), '{"casks":[],"brews":[]}');
    const result = await migrateMachineFile(nixPath, 'ali-pro');
    expect(result.changed).toBe(false);
  });
});
