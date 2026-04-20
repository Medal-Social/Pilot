// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { errorCodes, KitError } from '../errors.js';
import { type KitConfig, kitConfigSchema } from './schema.js';

export interface LoadOpts {
  env?: NodeJS.ProcessEnv;
  home?: string;
}

export type LoadedKitConfig = KitConfig & { repoDir: string };

export async function loadKitConfig(opts: LoadOpts = {}): Promise<LoadedKitConfig> {
  const env = opts.env ?? process.env;
  const home = opts.home ?? process.env.HOME ?? '';

  const candidates: string[] = [];
  if (env.KIT_CONFIG) candidates.push(env.KIT_CONFIG);
  if (home) {
    candidates.push(join(home, 'Documents', 'Code', 'kit', 'kit.config.json'));
  }

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const raw = await readFile(path, 'utf8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new KitError(errorCodes.KIT_CONFIG_INVALID, `${path}: ${(e as Error).message}`);
    }
    const result = kitConfigSchema.safeParse(parsed);
    if (!result.success) {
      throw new KitError(errorCodes.KIT_CONFIG_INVALID, `${path}: ${result.error.message}`);
    }
    // Derive repoDir from the config file's location unless explicitly overridden in the file.
    // This makes the same kit.config.json work for any user without editing per-machine paths.
    const repoDir = result.data.repoDir ?? dirname(path);
    return { ...result.data, repoDir };
  }

  throw new KitError(errorCodes.KIT_CONFIG_NOT_FOUND, candidates.join(', '));
}
