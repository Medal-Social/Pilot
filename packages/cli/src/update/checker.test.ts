// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import * as child_process from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import { applyUpdate, checkForUpdates } from './checker.js';

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

describe('applyUpdate', () => {
  it('returns success when npm install succeeds', async () => {
    mockExecFile('');
    const result = await applyUpdate();
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns failure with PilotError when npm install fails', async () => {
    mockExecFileError('EACCES permission denied');
    const result = await applyUpdate();
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('UPDATE_INSTALL_FAILED');
  });

  it('handles non-Error thrown values in applyUpdate', async () => {
    vi.mocked(child_process.execFile).mockImplementation((_cmd, _args, _opts, cb) => {
      (cb as ExecFileCallback)('fail' as unknown as NodeJS.ErrnoException, '', '');
      return undefined as unknown as ReturnType<typeof child_process.execFile>;
    });
    const result = await applyUpdate();
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('UPDATE_INSTALL_FAILED');
  });
});
