// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Exec } from '../shell/exec.js';

export type CleanTargetKind = 'path' | 'brew' | 'docker';

export interface CleanTarget {
  id: string;
  label: string;
  kind: CleanTargetKind;
  path?: string;
  contentsOnly?: boolean;
}

export interface ScannedTarget {
  target: CleanTarget;
  bytes: number;
}

export interface DeleteResult {
  id: string;
  freed: number;
  warning?: string;
}

const HOME = homedir();

export const CLEAN_TARGETS: CleanTarget[] = [
  {
    id: 'system-caches',
    label: 'System Caches',
    kind: 'path',
    path: join(HOME, 'Library/Caches'),
    contentsOnly: true,
  },
  {
    id: 'system-logs',
    label: 'System Logs',
    kind: 'path',
    path: join(HOME, 'Library/Logs'),
    contentsOnly: true,
  },
  {
    id: 'trash',
    label: 'Trash',
    kind: 'path',
    path: join(HOME, '.Trash'),
    contentsOnly: true,
  },
  {
    id: 'xcode-derived',
    label: 'Xcode DerivedData',
    kind: 'path',
    path: join(HOME, 'Library/Developer/Xcode/DerivedData'),
  },
  {
    id: 'simulator-caches',
    label: 'CoreSimulator Caches',
    kind: 'path',
    path: join(HOME, 'Library/Developer/CoreSimulator/Caches'),
  },
  { id: 'brew', label: 'Homebrew cache', kind: 'brew' },
  {
    id: 'npm',
    label: 'npm cache',
    kind: 'path',
    path: join(HOME, '.npm/_cacache'),
  },
  {
    id: 'pnpm',
    label: 'pnpm store',
    kind: 'path',
    path: join(HOME, '.local/share/pnpm/store'),
  },
  {
    id: 'yarn',
    label: 'yarn cache',
    kind: 'path',
    path: join(HOME, '.yarn/cache'),
  },
  {
    id: 'pip',
    label: 'pip cache',
    kind: 'path',
    path: join(HOME, 'Library/Caches/pip'),
  },
  {
    id: 'gradle',
    label: 'Gradle caches',
    kind: 'path',
    path: join(HOME, '.gradle/caches'),
  },
  {
    id: 'maven',
    label: 'Maven repository',
    kind: 'path',
    path: join(HOME, '.m2/repository'),
  },
  { id: 'docker', label: 'Docker', kind: 'docker' },
];

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

async function scanPath(exec: Exec, path: string): Promise<number> {
  const r = await exec.run('du', ['-sk', path]);
  if (r.code !== 0) return 0;
  const kb = Number.parseInt(r.stdout.split('\t')[0], 10);
  return Number.isNaN(kb) ? 0 : kb * 1024;
}

async function resolveBrewCache(exec: Exec): Promise<string | null> {
  const r = await exec.run('brew', ['--cache']);
  return r.code === 0 ? r.stdout.trim() || null : null;
}

async function isDockerRunning(exec: Exec): Promise<boolean> {
  return (await exec.run('docker', ['info'])).code === 0;
}

export async function scanTargets(
  exec: Exec,
  targets: CleanTarget[] = CLEAN_TARGETS
): Promise<ScannedTarget[]> {
  const results = await Promise.all(
    targets.map(async (target): Promise<ScannedTarget | null> => {
      if (target.kind === 'docker') {
        return (await isDockerRunning(exec)) ? { target, bytes: 0 } : null;
      }
      if (target.kind === 'brew') {
        const cachePath = await resolveBrewCache(exec);
        if (!cachePath) return null;
        const bytes = await scanPath(exec, cachePath);
        return bytes > 0 ? { target: { ...target, path: cachePath }, bytes } : null;
      }
      const bytes = await scanPath(exec, target.path!);
      return bytes > 0 ? { target, bytes } : null;
    })
  );
  return results.filter((r): r is ScannedTarget => r !== null);
}
