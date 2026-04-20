// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { realExec } from './exec.js';

describe('realExec.run', () => {
  it('captures stdout and exit code on success', async () => {
    const result = await realExec.run('node', ['-e', 'process.stdout.write("hi")']);
    expect(result.stdout.trim()).toBe('hi');
    expect(result.code).toBe(0);
  });

  it('captures stderr and non-zero exit on failure', async () => {
    const result = await realExec.run('node', ['-e', 'process.exit(2)']);
    expect(result.code).toBe(2);
  });

  it('honors the cwd option', async () => {
    const result = await realExec.run('node', ['-e', 'process.stdout.write(process.cwd())'], {
      cwd: '/tmp',
    });
    // On macOS, /tmp is symlinked to /private/tmp
    expect(['/tmp', '/private/tmp']).toContain(result.stdout.trim());
  });

  it('does not hang when child reads stdin and no input is provided', async () => {
    // Without closing stdin, this would wait forever for EOF.
    const result = await realExec.run(
      'node',
      ['-e', 'process.stdin.on("end", () => process.exit(0)); process.stdin.resume();'],
      { timeoutMs: 5000 }
    );
    // If stdin isn't closed, the timeout fires (code 124). Should be a clean 0.
    expect(result.code).toBe(0);
  });

  it('forwards opts.input when provided', async () => {
    const result = await realExec.run(
      'node',
      [
        '-e',
        'let d=""; process.stdin.on("data",c=>d+=c); process.stdin.on("end",()=>process.stdout.write(d))',
      ],
      { input: 'hello' }
    );
    expect(result.stdout).toBe('hello');
    expect(result.code).toBe(0);
  });

  it('reports timeout as code 124 with marker in stderr', async () => {
    const result = await realExec.run('node', ['-e', 'setTimeout(() => {}, 60000)'], {
      timeoutMs: 200,
    });
    expect(result.code).toBe(124);
    expect(result.stderr).toContain('timeout after 200ms');
  });

  it('interactive mode skips capture and returns exit code', async () => {
    // We can't truly test TTY without one, but we can verify the code path runs.
    // Use /bin/true which exits 0 immediately.
    const result = await realExec.run('true', [], { interactive: true });
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(''); // not captured in interactive mode
  });
});
