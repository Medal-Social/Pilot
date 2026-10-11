// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as child_process from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import { applyUpdate, checkForUpdates, detectInstallMethod } from './checker.js';

vi.mock('node:child_process');

type ExecFileCallback = (err: NodeJS.ErrnoException | null, stdout: string, stderr: string) => void;

function mockExecFile(stdout: string) {
  vi.mocked(child_process.execFile).mockImplementation((_cmd, _args, _opts, cb) => {
    (cb as ExecFileCallback)(null, stdout, '');
    return undefined as unknown as ReturnType<typeof child_process.execFile>;
  });
}

function mockExecFileError(message: string) {
  vi.mocked(child_process.execFile).mockImplementation((_cmd, _args, _opts, cb) => {
    (cb as ExecFileCallback)(Object.assign(new Error(message), { code: 'ENOENT' }), '', '');
    return undefined as unknown as ReturnType<typeof child_process.execFile>;
  });
}

describe('checkForUpdates', () => {
  it('detects update available', async () => {
    mockExecFile('1.0.0\n');
    const result = await checkForUpdates('0.1.0');
    expect(result.hasUpdate).toBe(true);
    expect(result.current).toBe('0.1.0');
    expect(result.latest).toBe('1.0.0');
  });

  it('detects no update needed', async () => {
    mockExecFile('0.1.0\n');
    const result = await checkForUpdates('0.1.0');
    expect(result.hasUpdate).toBe(false);
  });

  it('treats npm 404 as up-to-date (not error)', async () => {
    mockExecFileError('npm ERR! 404 Not Found');
    const result = await checkForUpdates('0.1.0');
    expect(result.hasUpdate).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it('treats network failure as PilotError', async () => {
    mockExecFileError('npm ERR! network request failed');
    const result = await checkForUpdates('0.1.0');
    expect(result.hasUpdate).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('UPDATE_CHECK_FAILED');
    expect(result.error?.message).not.toContain('npm');
  });

  it('handles non-Error thrown values gracefully', async () => {
    vi.mocked(child_process.execFile).mockImplementation((_cmd, _args, _opts, cb) => {
      (cb as ExecFileCallback)('string error' as unknown as NodeJS.ErrnoException, '', '');
      return undefined as unknown as ReturnType<typeof child_process.execFile>;
    });
    const result = await checkForUpdates('0.1.0');
    expect(result.hasUpdate).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('detectInstallMethod', () => {
  it('returns "homebrew" when execPath lives under Cellar/pilot', async () => {
    mockExecFile('');
    const m = await detectInstallMethod('/opt/homebrew/Cellar/pilot/0.5.0/bin/pilot');
    expect(m).toBe('homebrew');
  });

  it('returns "nix" when execPath is in /nix/store/', async () => {
    mockExecFile('');
    const m = await detectInstallMethod('/nix/store/abc-pilot-0.5.0/bin/pilot');
    expect(m).toBe('nix');
  });

  it('returns "nix" when execPath lives in ~/.nix-profile/', async () => {
    mockExecFile('');
    const m = await detectInstallMethod('/Users/x/.nix-profile/bin/pilot');
    expect(m).toBe('nix');
  });

  it('returns "npm" when execPath is under npm root -g output', async () => {
    mockExecFile('/usr/local/lib/node_modules\n');
    const m = await detectInstallMethod(
      '/usr/local/lib/node_modules/@medalsocial/pilot/dist/bin/pilot.js'
    );
    expect(m).toBe('npm');
  });

  it('returns "unknown" when no pattern matches and npm root -g fails', async () => {
    mockExecFileError('npm: command not found');
    const m = await detectInstallMethod('/some/random/path/pilot');
    expect(m).toBe('unknown');
  });

  it('returns "unknown" when npm root -g returns empty', async () => {
    mockExecFile('\n');
    const m = await detectInstallMethod('/some/random/path/pilot');
    expect(m).toBe('unknown');
  });

  it('inspects the entry script when execPath is a Node runtime (npm pilot on Nix node)', async () => {
    // `npm install -g` runs pilot as `node .../dist/bin/pilot.js`, so execPath is
    // the Node binary. When Node itself comes from Nix, the old path check said
    // "nix" and `pilot update` refused even though npm could upgrade it.
    mockExecFile('/usr/local/lib/node_modules\n');
    const m = await detectInstallMethod(
      '/nix/store/abc-nodejs-24.0.0/bin/node',
      '/usr/local/lib/node_modules/@medalsocial/pilot/dist/bin/pilot.js'
    );
    expect(m).toBe('npm');
  });

  it('inspects the entry script for node.exe and nodejs runtimes too', async () => {
    mockExecFile('');
    await expect(
      detectInstallMethod('C:\\nodejs\\node.exe', '/opt/homebrew/Cellar/pilot/0.7.2/bin/pilot')
    ).resolves.toBe('homebrew');
    await expect(
      detectInstallMethod('/usr/bin/nodejs', '/nix/store/abc-pilot/bin/pilot')
    ).resolves.toBe('nix');
  });

  it('keeps using a non-Node execPath even when an entry script is given', async () => {
    mockExecFile('');
    const m = await detectInstallMethod(
      '/opt/homebrew/Cellar/pilot/0.7.2/bin/pilot',
      '/usr/local/lib/node_modules/@medalsocial/pilot/dist/bin/pilot.js'
    );
    expect(m).toBe('homebrew');
  });

  it('falls back to execPath when execPath is Node but no entry script is known', async () => {
    mockExecFile('');
    const m = await detectInstallMethod('/nix/store/abc-nodejs/bin/node', '');
    expect(m).toBe('nix');
  });
});

describe('applyUpdate', () => {
  it('returns success when npm install succeeds (npm-installed pilot)', async () => {
    mockExecFile('/usr/local/lib/node_modules\n');
    const result = await applyUpdate(
      '/usr/local/lib/node_modules/@medalsocial/pilot/dist/bin/pilot.js'
    );
    expect(result.success).toBe(true);
    expect(result.method).toBe('npm');
    expect(result.error).toBeUndefined();
  });

  it('runs `brew upgrade pilot` for Homebrew-installed pilot', async () => {
    const calls: Array<[string, readonly string[]]> = [];
    vi.mocked(child_process.execFile).mockImplementation((cmd, args, _opts, cb) => {
      calls.push([cmd as string, args as string[]]);
      (cb as ExecFileCallback)(null, '', '');
      return undefined as unknown as ReturnType<typeof child_process.execFile>;
    });
    const result = await applyUpdate('/opt/homebrew/Cellar/pilot/0.5.0/bin/pilot');
    expect(result.success).toBe(true);
    expect(result.method).toBe('homebrew');
    const upgradeCall = calls.find(([cmd]) => cmd === 'brew');
    expect(upgradeCall).toBeDefined();
    expect(upgradeCall?.[1]).toEqual(['upgrade', 'pilot']);
  });

  it('refuses to update Nix-installed pilot with a clear message', async () => {
    mockExecFile('');
    const result = await applyUpdate('/nix/store/abc-pilot-0.5.0/bin/pilot');
    expect(result.success).toBe(false);
    expect(result.method).toBe('nix');
    expect(result.error?.code).toBe('UPDATE_NIX_NOT_SUPPORTED');
    expect(result.error?.message).toMatch(/Nix/);
  });

  it('returns failure with PilotError when npm install fails', async () => {
    mockExecFileError('EACCES permission denied');
    const result = await applyUpdate('/some/random/path/pilot');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('UPDATE_INSTALL_FAILED');
  });

  it('handles non-Error thrown values in applyUpdate', async () => {
    vi.mocked(child_process.execFile).mockImplementation((_cmd, _args, _opts, cb) => {
      (cb as ExecFileCallback)('fail' as unknown as NodeJS.ErrnoException, '', '');
      return undefined as unknown as ReturnType<typeof child_process.execFile>;
    });
    const result = await applyUpdate('/some/random/path/pilot');
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('UPDATE_INSTALL_FAILED');
  });
});
