// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { type Apps, HOMEBREW_NAME } from '../apps/schema.js';
import { loadAppsJson, writeAppsJson } from '../apps/store.js';
import { errorCodes, KitError } from '../errors.js';

export function listApps(path: string): Apps {
  return loadAppsJson(path);
}

export async function addApp(
  path: string,
  name: string,
  kind: 'casks' | 'brews' = 'casks'
): Promise<void> {
  if (!HOMEBREW_NAME.test(name)) {
    throw new KitError(errorCodes.KIT_APPS_INVALID_NAME, name);
  }
  const apps = loadAppsJson(path);
  const lower = name.toLowerCase();
  if (apps[kind].some((n) => n.toLowerCase() === lower)) {
    throw new KitError(errorCodes.KIT_APPS_DUPLICATE, name);
  }
  writeAppsJson(path, { ...apps, [kind]: [...apps[kind], name] });
}

export async function removeApp(
  path: string,
  name: string,
  kind: 'casks' | 'brews' = 'casks'
): Promise<void> {
  const apps = loadAppsJson(path);
  writeAppsJson(path, { ...apps, [kind]: apps[kind].filter((n) => n !== name) });
}
