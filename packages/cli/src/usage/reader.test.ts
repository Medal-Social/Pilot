// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findClaudeProjectDir, readClaudeEntries } from './reader.js';
import type { UsageWindow } from './types.js';

const WINDOW: UsageWindow = {
  since: new Date('2026-04-22T00:00:00Z'),
  until: new Date('2026-04-22T23:59:59Z'),
  label: 'today',
};

describe('findClaudeProjectDir', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'pilot-usage-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it('returns null when no Claude projects directory exists', () => {
    vi.stubEnv('CLAUDE_CONFIG_DIR', join(tmpDir, 'nonexistent'));
    expect(findClaudeProjectDir('/some/project')).toBeNull();
  });

  it('finds project dir via CLAUDE_CONFIG_DIR env var', async () => {
    const encoded = '/some/project'.replace(/\//g, '-');
    const projectDir = join(tmpDir, 'projects', encoded);
    await mkdir(projectDir, { recursive: true });
    vi.stubEnv('CLAUDE_CONFIG_DIR', tmpDir);
    expect(findClaudeProjectDir('/some/project')).toBe(projectDir);
  });

  it('encodes path with hyphens', async () => {
    const projectDir = join(tmpDir, 'projects', '-Users-ali-code-pilot');
    await mkdir(projectDir, { recursive: true });
    vi.stubEnv('CLAUDE_CONFIG_DIR', tmpDir);
    expect(findClaudeProjectDir('/Users/ali/code/pilot')).toBe(projectDir);
  });
});

describe('readClaudeEntries', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'pilot-usage-claude-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  function entry(overrides: Record<string, unknown> = {}) {
    return JSON.stringify({
      timestamp: '2026-04-22T10:00:00Z',
      message: {
        id: 'msg-1',
        model: 'claude-opus-4',
        usage: {
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_input_tokens: 100,
          cache_read_input_tokens: 50,
        },
      },
      costUSD: 0.84,
      requestId: 'req-1',
      ...overrides,
    });
  }

  it('reads entries from a JSONL file', async () => {
    await writeFile(join(tmpDir, 'session.jsonl'), entry());
    const entries = await readClaudeEntries(tmpDir, WINDOW);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.model).toBe('claude-opus-4');
    expect(entries[0]?.inputTokens).toBe(1000);
    expect(entries[0]?.outputTokens).toBe(500);
    expect(entries[0]?.cacheCreationTokens).toBe(100);
    expect(entries[0]?.cacheReadTokens).toBe(50);
    expect(entries[0]?.costUSD).toBe(0.84);
    expect(entries[0]?.costKnown).toBe(true);
    expect(entries[0]?.provider).toBe('claude');
  });

  it('reads entries from nested subdirectories', async () => {
    const sub = join(tmpDir, 'session-abc');
    await mkdir(sub, { recursive: true });
    await writeFile(join(sub, 'chat.jsonl'), entry());
    const entries = await readClaudeEntries(tmpDir, WINDOW);
    expect(entries).toHaveLength(1);
  });

  it('skips entries outside the time window', async () => {
    const outside = entry({ timestamp: '2026-04-21T10:00:00Z' });
    await writeFile(join(tmpDir, 'old.jsonl'), outside);
    const entries = await readClaudeEntries(tmpDir, WINDOW);
    expect(entries).toHaveLength(0);
  });

  it('skips isApiErrorMessage entries', async () => {
    const errEntry = entry({ isApiErrorMessage: true });
    await writeFile(join(tmpDir, 'err.jsonl'), errEntry);
    const entries = await readClaudeEntries(tmpDir, WINDOW);
    expect(entries).toHaveLength(0);
  });

  it('deduplicates entries with same messageId + requestId', async () => {
    const line = entry();
    await writeFile(join(tmpDir, 'dup.jsonl'), `${line}\n${line}`);
    const entries = await readClaudeEntries(tmpDir, WINDOW);
    expect(entries).toHaveLength(1);
  });

  it('sets costKnown=false when costUSD is absent', async () => {
    const noCost = JSON.stringify({
      timestamp: '2026-04-22T10:00:00Z',
      message: {
        id: 'msg-nc',
        model: 'claude-sonnet-4-6',
        usage: { input_tokens: 100, output_tokens: 50 },
      },
      requestId: 'req-nc',
    });
    await writeFile(join(tmpDir, 'nocost.jsonl'), noCost);
    const entries = await readClaudeEntries(tmpDir, WINDOW);
    expect(entries[0]?.costKnown).toBe(false);
    expect(entries[0]?.costUSD).toBe(0);
  });

  it('skips malformed JSON lines gracefully', async () => {
    await writeFile(join(tmpDir, 'bad.jsonl'), `not-json\n${entry()}`);
    const entries = await readClaudeEntries(tmpDir, WINDOW);
    expect(entries).toHaveLength(1);
  });

  it('returns empty array for nonexistent directory', async () => {
    const entries = await readClaudeEntries(join(tmpDir, 'nonexistent'), WINDOW);
    expect(entries).toHaveLength(0);
  });
});
