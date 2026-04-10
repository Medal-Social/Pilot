import { execFileSync } from 'node:child_process';

export interface UpdateCheckResult {
  current: string;
  latest: string;
  hasUpdate: boolean;
  error?: string;
}

export async function checkForUpdates(currentVersion: string): Promise<UpdateCheckResult> {
  try {
    const output = execFileSync('npm', ['view', '@medalsocial/pilot', 'version'], {
      encoding: 'utf-8',
      timeout: 10000,
    });
    const latest = String(output).trim();

    return {
      current: currentVersion,
      latest,
      hasUpdate: latest !== currentVersion,
    };
  } catch (err) {
    return {
      current: currentVersion,
      latest: currentVersion,
      hasUpdate: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export function applyUpdate(): { success: boolean; error?: string } {
  try {
    execFileSync('npm', ['install', '-g', '@medalsocial/pilot@latest'], {
      encoding: 'utf-8',
      timeout: 120000,
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
