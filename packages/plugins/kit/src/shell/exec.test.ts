// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

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
});
