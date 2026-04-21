// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../usage/reader.js', () => ({
  findClaudeProjectDir: vi.fn(() => '/fake/project/dir'),
  readClaudeEntries: vi.fn(async () => [
    {
      timestamp: new Date('2026-04-22T10:00:00Z'),
      model: 'claude-opus-4',
      inputTokens: 1000,
      outputTokens: 500,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      costUSD: 0.5,
      costKnown: true,
      provider: 'claude',
    },
  ]),
  readCodexEntries: vi.fn(async () => []),
}));

vi.mock('../usage/format.js', () => ({
  formatTable: vi.fn(),
  formatJson: vi.fn(),
}));

describe('runUsage', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('calls formatTable by default', async () => {
    const { runUsage } = await import('./usage.js');
    const { formatTable } = await import('../usage/format.js');
    await runUsage({});
    expect(vi.mocked(formatTable)).toHaveBeenCalledOnce();
  });

  it('calls formatJson when --json is passed', async () => {
    const { runUsage } = await import('./usage.js');
    const { formatJson } = await import('../usage/format.js');
    await runUsage({ json: true });
    expect(vi.mocked(formatJson)).toHaveBeenCalledOnce();
  });

  it('prints no-data message when no providers have data', async () => {
    const { readClaudeEntries, readCodexEntries } = await import('../usage/reader.js');
    vi.mocked(readClaudeEntries).mockResolvedValueOnce([]);
    vi.mocked(readCodexEntries).mockResolvedValueOnce([]);
    const { runUsage } = await import('./usage.js');
    const { formatTable } = await import('../usage/format.js');
    await runUsage({});
    expect(vi.mocked(formatTable)).not.toHaveBeenCalled();
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('No usage data'));
  });

  it('passes UsageReport to formatTable with correct project name', async () => {
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/Users/ali/code/pilot');
    const { runUsage } = await import('./usage.js');
    const { formatTable } = await import('../usage/format.js');
    await runUsage({});
    const report = vi.mocked(formatTable).mock.calls[0]?.[0];
    expect(report?.project).toBe('pilot');
    cwdSpy.mockRestore();
  });

  it('builds today window by default', async () => {
    const { runUsage } = await import('./usage.js');
    const { formatTable } = await import('../usage/format.js');
    await runUsage({});
    const report = vi.mocked(formatTable).mock.calls[0]?.[0];
    expect(report?.window.label).toBe('today');
  });

  it('builds last-7-days window with --week', async () => {
    const { runUsage } = await import('./usage.js');
    const { formatTable } = await import('../usage/format.js');
    await runUsage({ week: true });
    const report = vi.mocked(formatTable).mock.calls[0]?.[0];
    expect(report?.window.label).toBe('last 7 days');
  });

  it('builds this-month window with --month', async () => {
    const { runUsage } = await import('./usage.js');
    const { formatTable } = await import('../usage/format.js');
    await runUsage({ month: true });
    const report = vi.mocked(formatTable).mock.calls[0]?.[0];
    expect(report?.window.label).toBe('this month');
  });

  it('builds since window with --since', async () => {
    const { runUsage } = await import('./usage.js');
    const { formatTable } = await import('../usage/format.js');
    await runUsage({ since: '20260401' });
    const report = vi.mocked(formatTable).mock.calls[0]?.[0];
    expect(report?.window.label).toBe('since 20260401');
  });

  it('outputs JSON error when --json and no data', async () => {
    const { readClaudeEntries, readCodexEntries } = await import('../usage/reader.js');
    vi.mocked(readClaudeEntries).mockResolvedValueOnce([]);
    vi.mocked(readCodexEntries).mockResolvedValueOnce([]);
    const { runUsage } = await import('./usage.js');
    const { formatJson } = await import('../usage/format.js');
    await runUsage({ json: true });
    expect(vi.mocked(formatJson)).not.toHaveBeenCalled();
    const output = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(() => JSON.parse(output)).not.toThrow();
    const parsed = JSON.parse(output);
    expect(parsed.error).toBeDefined();
  });

  it('writes error and exits for invalid --since format', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const { runUsage } = await import('./usage.js');
    await expect(runUsage({ since: 'invalid' })).rejects.toThrow('exit');
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('YYYYMMDD'));
    exitSpy.mockRestore();
  });
});
