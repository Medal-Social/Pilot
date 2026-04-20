// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { type ChildProcess, spawn as nodeSpawn } from 'node:child_process';

export interface ExecOpts {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  timeoutMs?: number;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface SpawnedProcess {
  child: ChildProcess;
  done: Promise<ExecResult>;
}

export interface Exec {
  run(cmd: string, args: string[], opts?: ExecOpts): Promise<ExecResult>;
  spawn(cmd: string, args: string[], opts?: ExecOpts): SpawnedProcess;
}

function buffered(child: ChildProcess, timeoutMs?: number): Promise<ExecResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    child.stdout?.on('data', (b) => {
      stdout += b.toString();
    });
    child.stderr?.on('data', (b) => {
      stderr += b.toString();
    });
    const timer =
      timeoutMs !== undefined
        ? setTimeout(() => {
            timedOut = true;
            child.kill('SIGKILL');
          }, timeoutMs)
        : null;
    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer);
      // Anything other than a clean exit (numeric code, no signal) is a failure.
      // Timeouts (SIGKILL after timer fires) and signal-killed processes must surface
      // as non-zero so callers don't mistake "killed" for "succeeded".
      if (timedOut) {
        resolve({
          stdout,
          stderr: `${stderr}${stderr.endsWith('\n') || stderr === '' ? '' : '\n'}[kit] killed: timeout after ${timeoutMs}ms`,
          code: 124,
        });
        return;
      }
      if (signal) {
        resolve({
          stdout,
          stderr: `${stderr}${stderr.endsWith('\n') || stderr === '' ? '' : '\n'}[kit] killed by signal ${signal}`,
          code: 128,
        });
        return;
      }
      resolve({ stdout, stderr, code: code ?? 1 });
    });
    child.on('error', () => {
      if (timer) clearTimeout(timer);
      resolve({ stdout, stderr, code: 1 });
    });
  });
}

export const realExec: Exec = {
  run(cmd, args, opts = {}) {
    const child = nodeSpawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (opts.input !== undefined) {
      child.stdin?.end(opts.input);
    }
    return buffered(child, opts.timeoutMs);
  },
  spawn(cmd, args, opts = {}) {
    const child = nodeSpawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { child, done: buffered(child, opts.timeoutMs) };
  },
};
