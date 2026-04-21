// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { errorCodes, PilotError } from '../errors.js';
import { BUNDLED_REGISTRY } from './bundled.js';
import { type RegistryIndex, RegistryIndexSchema } from './types.js';

const REGISTRY_URL = 'https://pilot.medalsocial.com/registry/v1/index.json';
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CachedIndex extends RegistryIndex {
  cachedAt: number;
}

interface FetchResult {
  index: RegistryIndex;
  fromCache: boolean;
  offline: boolean;
}

interface FetchOptions {
  cacheDir: string;
  ttlMs?: number;
}

function verifySha256(index: RegistryIndex): void {
  const computed = createHash('sha256').update(JSON.stringify(index.templates)).digest('hex');
  if (computed !== index.sha256) {
    throw new PilotError(errorCodes.UP_REGISTRY_TAMPERED);
  }
}

function readCache(cacheFile: string): CachedIndex | null {
  if (!existsSync(cacheFile)) return null;
  try {
    return JSON.parse(readFileSync(cacheFile, 'utf-8')) as CachedIndex;
  } catch {
    return null;
  }
}

function writeCache(cacheDir: string, index: RegistryIndex): void {
  mkdirSync(cacheDir, { recursive: true });
  const cacheFile = join(cacheDir, 'index.json');
  const cached: CachedIndex = { ...index, cachedAt: Date.now() };
  writeFileSync(cacheFile, JSON.stringify(cached, null, 2));
}

export async function fetchRegistry({
  cacheDir,
  ttlMs = DEFAULT_TTL_MS,
}: FetchOptions): Promise<FetchResult> {
  const cacheFile = join(cacheDir, 'index.json');
  const cached = readCache(cacheFile);

  // Return fresh cache if within TTL
  if (cached && Date.now() - cached.cachedAt < ttlMs) {
    const { cachedAt: _cachedAt, ...index } = cached;
    return { index, fromCache: true, offline: false };
  }

  // Try fetching remote
  try {
    const res = await fetch(REGISTRY_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const index = RegistryIndexSchema.parse(raw);
    verifySha256(index);
    writeCache(cacheDir, index);
    return { index, fromCache: false, offline: false };
  } catch (err) {
    if (err instanceof PilotError) throw err; // re-throw tampered error

    // Network failure — fall back to stale cache
    if (cached) {
      const { cachedAt: _cachedAt, ...index } = cached;
      return { index, fromCache: true, offline: true };
    }

    // No cache — use bundled fallback
    return { index: BUNDLED_REGISTRY, fromCache: false, offline: true };
  }
}
