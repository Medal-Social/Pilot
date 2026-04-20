// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { errorCodes, KitError } from '../errors.js';
import { type Apps, appsSchema } from './schema.js';

export function loadAppsJson(path: string): Apps {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (e) {
    throw new KitError(errorCodes.KIT_APPS_CORRUPT, `${path}: ${(e as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new KitError(errorCodes.KIT_APPS_CORRUPT, `${path}: ${(e as Error).message}`);
  }
  const result = appsSchema.safeParse(parsed);
  if (!result.success) {
    throw new KitError(errorCodes.KIT_APPS_CORRUPT, `${path}: ${result.error.message}`);
  }
  return result.data;
}

export function writeAppsJson(path: string, apps: Apps): void {
  const sorted: Apps = {
    casks: [...apps.casks].sort(),
    brews: [...apps.brews].sort(),
  };
  const tmp = `${path}.tmp.${process.pid}`;
  writeFileSync(tmp, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
  renameSync(tmp, path);
}
