// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { realExec } from './exec.js';

describe('realExec', () => {
  it('captures stdout from a command', async () => {
    const result = await realExec.run('echo', ['hello world']);
    expect(result.stdout.trim()).toBe('hello world');
    expect(result.code).toBe(0);
  });

  it('captures stderr from a command', async () => {
    const result = await realExec.run('node', ['-e', 'process.stderr.write("err-output\\n")']);
    expect(result.stderr).toContain('err-output');
    expect(result.code).toBe(0);
  });

  it('returns non-zero exit code on failure', async () => {
    const result = await realExec.run('node', ['-e', 'process.exit(2)']);
    expect(result.code).toBe(2);
  });

  it('returns code=1 when command does not exist', async () => {
    const result = await realExec.run('definitely-not-a-real-command-xyz', []);
    expect(result.code).toBe(1);
  });
});
