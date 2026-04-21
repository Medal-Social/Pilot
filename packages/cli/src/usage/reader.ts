// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Dirent } from 'node:fs';
import { createReadStream, existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import type { UsageEntry, UsageWindow } from './types.js';

function claudeBasePaths(): string[] {
  const envVar = process.env.CLAUDE_CONFIG_DIR;
  if (envVar) {
    return envVar.split(',').map((p) => join(p.trim(), 'projects'));
  }
  const home = homedir();
  return [join(home, '.config', 'claude', 'projects'), join(home, '.claude', 'projects')];
}

export function findClaudeProjectDir(cwd: string): string | null {
  const encoded = cwd.replace(/\//g, '-');
  for (const base of claudeBasePaths()) {
    const candidate = join(base, encoded);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

async function globJsonl(dir: string): Promise<string[]> {
  const results: string[] = [];
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await globJsonl(full)));
    } else if (entry.name.endsWith('.jsonl')) {
      results.push(full);
    }
  }
  return results;
}

async function readJsonlLines(filePath: string): Promise<string[]> {
  const lines: string[] = [];
  const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) lines.push(trimmed);
  }
  return lines;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function asNum(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export async function readClaudeEntries(
  projectDir: string,
  window: UsageWindow
): Promise<UsageEntry[]> {
  const files = await globJsonl(projectDir);
  const seen = new Set<string>();
  const entries: UsageEntry[] = [];

  for (const file of files) {
    const lines = await readJsonlLines(file);
    for (const line of lines) {
      let raw: unknown;
      try {
        raw = JSON.parse(line);
      } catch {
        continue;
      }
      if (!isObj(raw)) continue;
      if (raw.isApiErrorMessage === true) continue;

      const msg = raw.message;
      if (!isObj(msg)) continue;
      const usage = msg.usage;
      if (!isObj(usage)) continue;

      const messageId = typeof msg.id === 'string' ? msg.id : '';
      const requestId = typeof raw.requestId === 'string' ? raw.requestId : '';
      const key = `${messageId}:${requestId}`;
      if (messageId && seen.has(key)) continue;
      if (messageId) seen.add(key);

      const tsRaw = raw.timestamp;
      if (typeof tsRaw !== 'string') continue;
      const timestamp = new Date(tsRaw);
      if (Number.isNaN(timestamp.getTime())) continue;
      if (timestamp < window.since || timestamp > window.until) continue;

      const model = typeof msg.model === 'string' ? msg.model : 'unknown';
      const costUSDRaw = raw.costUSD;
      const costKnown = typeof costUSDRaw === 'number';
      const costUSD = costKnown ? costUSDRaw : 0;

      entries.push({
        timestamp,
        model,
        inputTokens: asNum(usage.input_tokens),
        outputTokens: asNum(usage.output_tokens),
        cacheCreationTokens: asNum(usage.cache_creation_input_tokens),
        cacheReadTokens: asNum(usage.cache_read_input_tokens),
        costUSD,
        costKnown,
        provider: 'claude',
      });
    }
  }

  return entries;
}

export async function readCodexEntries(_window: UsageWindow): Promise<UsageEntry[]> {
  // Implemented in Task 5
  return [];
}
