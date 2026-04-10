import { describe, expect, it, vi } from 'vitest';
import { checkForUpdates } from './checker.js';
import * as child_process from 'node:child_process';

vi.mock('node:child_process');

describe('checkForUpdates', () => {
  it('detects update available', async () => {
    vi.mocked(child_process.execFileSync).mockReturnValue(Buffer.from('1.0.0\n'));
    const result = await checkForUpdates('0.1.0');
    expect(result.hasUpdate).toBe(true);
    expect(result.current).toBe('0.1.0');
    expect(result.latest).toBe('1.0.0');
  });

  it('detects no update needed', async () => {
    vi.mocked(child_process.execFileSync).mockReturnValue(Buffer.from('0.1.0\n'));
    const result = await checkForUpdates('0.1.0');
    expect(result.hasUpdate).toBe(false);
  });

  it('treats npm 404 as up-to-date (not error)', async () => {
    vi.mocked(child_process.execFileSync).mockImplementation(() => {
      throw new Error('npm ERR! 404 Not Found');
    });
    const result = await checkForUpdates('0.1.0');
    expect(result.hasUpdate).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it('treats network failure as error', async () => {
    vi.mocked(child_process.execFileSync).mockImplementation(() => {
      throw new Error('npm ERR! network request failed');
    });
    const result = await checkForUpdates('0.1.0');
    expect(result.hasUpdate).toBe(false);
    expect(result.error).toBeDefined();
  });
});
