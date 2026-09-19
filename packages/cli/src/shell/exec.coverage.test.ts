// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { realExec, runInherit } from './exec.js';

describe('subprocess lifecycle', () => {
  it('fails a signaled child while preserving output captured before termination', async () => {
    const result = await realExec.run(process.execPath, [
      '-e',
      'process.stdout.write("partial output", () => process.stderr.write("interrupted", () => process.kill(process.pid, "SIGTERM")))',
    ]);
    expect(result).toEqual({ stdout: 'partial output', stderr: 'interrupted', code: 1 });
  });

  it('inherits the parent environment by default and returns a failing child status', async () => {
    expect(await runInherit(process.execPath, ['-e', 'process.exit(23)'])).toBe(23);
  });

  it('passes explicit environment and working directory to an interactive child', async () => {
    const code = await runInherit(
      process.execPath,
      ['-e', 'process.exit(process.env.PILOT_EXEC_FIXTURE === process.cwd() ? 0 : 19)'],
      { cwd: process.cwd(), env: { PILOT_EXEC_FIXTURE: process.cwd() } }
    );
    expect(code).toBe(0);
  });

  it('returns failure for an inherited child terminated by a signal', async () => {
    expect(await runInherit(process.execPath, ['-e', 'process.kill(process.pid, "SIGTERM")'])).toBe(
      1
    );
  });

  it('returns a failure code when an interactive binary is unavailable', async () => {
    expect(await runInherit('/nonexistent/pilot-coverage-binary', [])).toBe(1);
  });
});
