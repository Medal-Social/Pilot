// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import type { Exec } from '../shell/exec.js';

export interface SystemInfo {
  os: string;
  osVersion: string;
  chip: 'Apple Silicon' | 'Intel';
  user: string;
}

export interface SystemDeps {
  exec: Exec;
  platform?: NodeJS.Platform;
  arch?: string;
  user?: string;
}

export async function getSystemInfo(deps: SystemDeps): Promise<SystemInfo> {
  const platform = deps.platform ?? process.platform;
  const arch = deps.arch ?? process.arch;
  const user = deps.user ?? process.env.USER ?? 'unknown';

  let os = platform === 'darwin' ? 'macOS' : platform === 'linux' ? 'Linux' : platform;
  let osVersion = '';

  if (platform === 'darwin') {
    const name = await deps.exec.run('sw_vers', ['-productName']);
    if (name.code === 0) os = name.stdout.trim() || os;
    const ver = await deps.exec.run('sw_vers', ['-productVersion']);
    if (ver.code === 0) osVersion = ver.stdout.trim();
  }

  const chip: SystemInfo['chip'] = arch === 'arm64' ? 'Apple Silicon' : 'Intel';
  return { os, osVersion, chip, user };
}
