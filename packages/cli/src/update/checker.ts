// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execFile } from 'node:child_process';
import { errorCodes, PilotError } from '../errors.js';

export interface UpdateCheckResult {
  current: string;
  latest: string;
  hasUpdate: boolean;
  error?: PilotError;
}

function execAsync(cmd: string, args: string[], timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { encoding: 'utf-8', timeout }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

export async function checkForUpdates(currentVersion: string): Promise<UpdateCheckResult> {
  try {
    const output = await execAsync('npm', ['view', '@medalsocial/pilot', 'version'], 10000);
    const latest = output.trim();

    return {
      current: currentVersion,
      latest,
      hasUpdate: latest !== currentVersion,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // npm 404 means package isn't published yet — not an error
    if (message.includes('404') || message.includes('Not Found')) {
      return {
        current: currentVersion,
        latest: currentVersion,
        hasUpdate: false,
      };
    }
    return {
      current: currentVersion,
      latest: currentVersion,
      hasUpdate: false,
      error: new PilotError(errorCodes.UPDATE_CHECK_FAILED, message),
    };
  }
}

export async function applyUpdate(): Promise<{ success: boolean; error?: PilotError }> {
  try {
    await execAsync('npm', ['install', '-g', '@medalsocial/pilot@latest'], 120000);
    return { success: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      error: new PilotError(errorCodes.UPDATE_INSTALL_FAILED, detail),
    };
  }
}
