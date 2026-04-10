import * as child_process from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import { checkForUpdates } from './checker.js';

vi.mock('node:child_process');

function mockExecFile(stdout: string) {
  vi.mocked(child_process.execFile).mockImplementation(((
    _cmd: unknown,
    _args: unknown,
    _opts: unknown,
    cb: unknown
  ) => {
    (cb as (err: null, stdout: string) => void)(null, stdout);
  }) as typeof child_process.execFile);
}

function mockExecFileError(message: string) {
  vi.mocked(child_process.execFile).mockImplementation(((
    _cmd: unknown,
    _args: unknown,
    _opts: unknown,
    cb: unknown
  ) => {
    (cb as (err: Error) => void)(new Error(message));
  }) as typeof child_process.execFile);
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
});
