// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { homedir } from 'node:os';
import { join } from 'node:path';

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
