import * as fs from 'node:fs';
import * as os from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backupKnowledge } from './backup.js';

vi.mock('node:fs');
vi.mock('node:os');

describe('backupKnowledge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10'));
    vi.mocked(os.homedir).mockReturnValue('/mock/home');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('copies knowledge dir to ~/pilot-backup-<date>/', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return String(p) === '/mock/home/.pilot/knowledge';
    });
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.cpSync).mockReturnValue(undefined);

    const result = backupKnowledge();

    expect(result.success).toBe(true);
    expect(result.skipped).toBeUndefined();
    expect(result.backupPath).toBe('/mock/home/pilot-backup-2026-04-10');
    expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/home/pilot-backup-2026-04-10', {
      recursive: true,
    });
    expect(fs.cpSync).toHaveBeenCalledWith(
      '/mock/home/.pilot/knowledge',
      '/mock/home/pilot-backup-2026-04-10',
      { recursive: true }
    );
  });

  it('appends suffix when backup dir already exists', async () => {
    const existingPaths = new Set([
      '/mock/home/.pilot/knowledge',
      '/mock/home/pilot-backup-2026-04-10',
      '/mock/home/pilot-backup-2026-04-10-2',
    ]);
    vi.mocked(fs.existsSync).mockImplementation((p) => existingPaths.has(String(p)));
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.cpSync).mockReturnValue(undefined);

    const result = backupKnowledge();

    expect(result.success).toBe(true);
    expect(result.backupPath).toBe('/mock/home/pilot-backup-2026-04-10-3');
    expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/home/pilot-backup-2026-04-10-3', {
      recursive: true,
    });
  });

  it('returns skip result when knowledge dir does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = backupKnowledge();

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.backupPath).toBeUndefined();
    expect(fs.cpSync).not.toHaveBeenCalled();
  });

  it('returns failure when copy throws', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return String(p) === '/mock/home/.pilot/knowledge';
    });
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.cpSync).mockImplementation(() => {
      throw new Error('disk full');
    });

    const result = backupKnowledge();

    expect(result.success).toBe(false);
    expect(result.backupPath).toBeUndefined();
  });
});
