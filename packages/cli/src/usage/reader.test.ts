// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findClaudeProjectDir, readClaudeEntries, readCodexEntries } from './reader.js';
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

  it('falls through to second path in comma-separated CLAUDE_CONFIG_DIR', async () => {
    const firstDir = join(tmpDir, 'first');
    const secondDir = join(tmpDir, 'second');
    const encoded = '/some/project'.replace(/\//g, '-');
    const projectDir = join(secondDir, 'projects', encoded);
    await mkdir(projectDir, { recursive: true });
    // firstDir has no projects — secondDir does
    vi.stubEnv('CLAUDE_CONFIG_DIR', `${firstDir},${secondDir}`);
    expect(findClaudeProjectDir('/some/project')).toBe(projectDir);
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

describe('readCodexEntries', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'pilot-usage-codex-'));
    vi.stubEnv('CODEX_HOME', tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  async function writeSession(name: string, lines: object[]): Promise<void> {
    const sessionsDir = join(tmpDir, 'sessions');
    await mkdir(sessionsDir, { recursive: true });
    await writeFile(join(sessionsDir, name), lines.map((l) => JSON.stringify(l)).join('\n'));
  }

  it('returns empty array when sessions directory does not exist', async () => {
    vi.stubEnv('CODEX_HOME', join(tmpDir, 'nonexistent'));
    const entries = await readCodexEntries(WINDOW);
    expect(entries).toHaveLength(0);
  });

  it('reads token usage from a Codex session file', async () => {
    await writeSession('proj.jsonl', [
      { timestamp: '2026-04-22T10:00:00Z', type: 'turn_context', payload: { model: 'gpt-5' } },
      {
        timestamp: '2026-04-22T10:01:00Z',
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 1200,
              cached_input_tokens: 200,
              output_tokens: 400,
              reasoning_output_tokens: 0,
              total_tokens: 1600,
            },
          },
        },
      },
    ]);
    const entries = await readCodexEntries(WINDOW);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.model).toBe('gpt-5');
    expect(entries[0]?.inputTokens).toBe(1200);
    expect(entries[0]?.outputTokens).toBe(400);
    expect(entries[0]?.cacheReadTokens).toBe(200);
    expect(entries[0]?.provider).toBe('codex');
  });

  it('applies delta math for cumulative counters', async () => {
    await writeSession('delta.jsonl', [
      { timestamp: '2026-04-22T10:00:00Z', type: 'turn_context', payload: { model: 'gpt-5' } },
      {
        timestamp: '2026-04-22T10:01:00Z',
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 1200,
              cached_input_tokens: 200,
              output_tokens: 400,
              reasoning_output_tokens: 0,
              total_tokens: 1600,
            },
          },
        },
      },
      {
        timestamp: '2026-04-22T10:02:00Z',
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 2000,
              cached_input_tokens: 300,
              output_tokens: 800,
              reasoning_output_tokens: 0,
              total_tokens: 2800,
            },
          },
        },
      },
    ]);
    const entries = await readCodexEntries(WINDOW);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.inputTokens).toBe(1200);
    expect(entries[1]?.inputTokens).toBe(800); // delta: 2000 - 1200
    expect(entries[1]?.cacheReadTokens).toBe(100); // delta: 300 - 200
  });

  it('computes cost for known model', async () => {
    await writeSession('cost.jsonl', [
      {
        timestamp: '2026-04-22T10:00:00Z',
        type: 'turn_context',
        payload: { model: 'gpt-4o-mini' },
      },
      {
        timestamp: '2026-04-22T10:01:00Z',
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 10_000,
              cached_input_tokens: 0,
              output_tokens: 5_000,
              reasoning_output_tokens: 0,
              total_tokens: 15_000,
            },
          },
        },
      },
    ]);
    const entries = await readCodexEntries(WINDOW);
    expect(entries[0]?.costKnown).toBe(true);
    expect(entries[0]?.costUSD).toBeGreaterThan(0);
  });

  it('marks costKnown=false for unknown model', async () => {
    await writeSession('unknown.jsonl', [
      {
        timestamp: '2026-04-22T10:00:00Z',
        type: 'turn_context',
        payload: { model: 'gpt-unknown-xyz' },
      },
      {
        timestamp: '2026-04-22T10:01:00Z',
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 1000,
              cached_input_tokens: 0,
              output_tokens: 500,
              reasoning_output_tokens: 0,
              total_tokens: 1500,
            },
          },
        },
      },
    ]);
    const entries = await readCodexEntries(WINDOW);
    expect(entries[0]?.costKnown).toBe(false);
  });

  it('skips entries outside the time window', async () => {
    await writeSession('old.jsonl', [
      { timestamp: '2026-04-21T10:00:00Z', type: 'turn_context', payload: { model: 'gpt-5' } },
      {
        timestamp: '2026-04-21T10:01:00Z',
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 1000,
              cached_input_tokens: 0,
              output_tokens: 500,
              reasoning_output_tokens: 0,
              total_tokens: 1500,
            },
          },
        },
      },
    ]);
    const entries = await readCodexEntries(WINDOW);
    expect(entries).toHaveLength(0);
  });
});
