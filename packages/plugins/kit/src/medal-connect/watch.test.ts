// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { watchKit } from './watch.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mc-watch-'));
  execSync('git init -q -b main && git config user.email t@t && git config user.name t', {
    cwd: dir,
  });
  mkdirSync(join(dir, 'machines'));
  writeFileSync(join(dir, 'machines', 't.apps.json'), JSON.stringify({ casks: [], brews: [] }));
  writeFileSync(join(dir, 'README'), '#');
  execSync('git add . && git commit -q -m init', { cwd: dir });
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('watchKit', () => {
  it('emits a kit.state event when apps.json changes', async () => {
    const events: Array<{ kind: string; snapshot?: unknown }> = [];
    const ctx = { kitRepoDir: dir, machineId: 't', user: 'u', machineType: 'darwin' as const };
    const sub = watchKit(ctx, (e) => events.push(e), { debounceMs: 50 });
    try {
      // Let the native watcher enter its event loop before the first mutation.
      await new Promise<void>((resolve) => setImmediate(resolve));
      writeFileSync(
        join(dir, 'machines', 't.apps.json'),
        JSON.stringify({ casks: ['spotify'], brews: [] })
      );
      // Real filesystem notifications and Git subprocesses share the host scheduler.
      await vi.waitFor(
        () => {
          const stateEvents = events.filter((e) => e.kind === 'kit.state');
          expect(stateEvents.length).toBeGreaterThanOrEqual(1);
          const last = stateEvents[stateEvents.length - 1] as { snapshot: { apps: string[] } };
          expect(last.snapshot.apps).toEqual(['spotify']);
        },
        { timeout: 4000 }
      );
    } finally {
      sub.dispose();
    }
  });

  it('coalesces rapid changes under the debounce window', async () => {
    const events: Array<unknown> = [];
    const ctx = { kitRepoDir: dir, machineId: 't', user: 'u', machineType: 'darwin' as const };
    const sub = watchKit(ctx, (e) => events.push(e), { debounceMs: 100 });
    try {
      for (let i = 0; i < 5; i++) {
        writeFileSync(
          join(dir, 'machines', 't.apps.json'),
          JSON.stringify({ casks: [`x${i}`], brews: [] })
        );
        await new Promise((r) => setTimeout(r, 10));
      }
      await vi.waitFor(
        () => {
          // Rapid changes coalesce and the final snapshot contains the latest edit.
          expect(events.length).toBeLessThan(5);
          expect(events.length).toBeGreaterThan(0);
          const last = events[events.length - 1] as { snapshot: { apps: string[] } };
          expect(last.snapshot.apps).toEqual(['x4']);
        },
        { timeout: 4000 }
      );
      // Keep observing after readiness so extra pending emissions cannot hide behind dispose.
      await new Promise((resolve) => setTimeout(resolve, 250));
      expect(events.length).toBeLessThan(5);
      const settled = events[events.length - 1] as { snapshot: { apps: string[] } };
      expect(settled.snapshot.apps).toEqual(['x4']);
    } finally {
      sub.dispose();
    }
  });

  it('dispose stops further events', async () => {
    const events: Array<unknown> = [];
    const ctx = { kitRepoDir: dir, machineId: 't', user: 'u', machineType: 'darwin' as const };
    const sub = watchKit(ctx, (e) => events.push(e), { debounceMs: 50 });
    sub.dispose();
    writeFileSync(
      join(dir, 'machines', 't.apps.json'),
      JSON.stringify({ casks: ['after-dispose'], brews: [] })
    );
    await new Promise((r) => setTimeout(r, 200));
    expect(events).toHaveLength(0);
  });
});
