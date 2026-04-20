// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface BackupResult {
  success: boolean;
  backupPath?: string;
  skipped?: boolean;
}

export function backupKnowledge(): BackupResult {
  const home = homedir();
  const knowledgeDir = join(home, '.pilot', 'knowledge');

  if (!existsSync(knowledgeDir)) {
    return { success: true, skipped: true };
  }

  const date = new Date().toISOString().slice(0, 10);
  const base = join(home, `pilot-backup-${date}`);

  let backupPath = base;
  if (existsSync(backupPath)) {
    let suffix = 2;
    while (existsSync(`${base}-${suffix}`)) {
      suffix++;
    }
    backupPath = `${base}-${suffix}`;
  }

  try {
    mkdirSync(backupPath, { recursive: true });
    cpSync(knowledgeDir, backupPath, { recursive: true });
    return { success: true, backupPath };
  } catch {
    return { success: false };
  }
}
