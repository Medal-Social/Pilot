// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { writeAppsJson } from '../apps/store.js';

export interface MigrateResult {
  changed: boolean;
}

const INLINE_RE = /homebrew\.(casks|brews)\s*=\s*\[([\s\S]*?)\];/g;

function parseList(body: string): string[] {
  return Array.from(body.matchAll(/"([^"]+)"/g)).map((m) => m[1]);
}

export async function migrateMachineFile(nixPath: string, machine: string): Promise<MigrateResult> {
  const original = readFileSync(nixPath, 'utf8');
  if (!INLINE_RE.test(original)) {
    return { changed: false };
  }
  INLINE_RE.lastIndex = 0;

  let casks: string[] = [];
  let brews: string[] = [];
  for (const match of original.matchAll(INLINE_RE)) {
    const kind = match[1];
    const items = parseList(match[2]);
    if (kind === 'casks') casks = items;
    if (kind === 'brews') brews = items;
  }

  const appsJsonPath = join(dirname(nixPath), `${machine}.apps.json`);
  writeAppsJson(appsJsonPath, { casks, brews });

  const replacement = `{ ... }: let
  apps = builtins.fromJSON (builtins.readFile ./${machine}.apps.json);
in {
  homebrew.casks = apps.casks;
  homebrew.brews = apps.brews;
}
`;
  writeFileSync(nixPath, replacement, 'utf8');
  return { changed: true };
}
