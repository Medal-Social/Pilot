// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type ChildProcess, spawn as nodeSpawn } from 'node:child_process';

export interface ExecOpts {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  timeoutMs?: number;
  /**
   * When true, attach the child to the parent's stdio (TTY) directly. Used for
   * commands that need real terminal I/O — e.g. opening vim/nvim, or any prompt
   * that draws a UI. Output is NOT captured (stdout/stderr in the result will
   * be empty strings); the exit code is still reported.
   */
  interactive?: boolean;
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

function inheritedExit(child: ChildProcess, timeoutMs?: number): Promise<ExecResult> {
  return new Promise((resolve) => {
    let timedOut = false;
    const timer =
      timeoutMs !== undefined
        ? setTimeout(() => {
            timedOut = true;
            child.kill('SIGKILL');
          }, timeoutMs)
        : null;
    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer);
      if (timedOut) {
        resolve({ stdout: '', stderr: `[kit] killed: timeout after ${timeoutMs}ms`, code: 124 });
        return;
      }
      if (signal) {
        resolve({ stdout: '', stderr: `[kit] killed by signal ${signal}`, code: 128 });
        return;
      }
      resolve({ stdout: '', stderr: '', code: code ?? 1 });
    });
    child.on('error', () => {
      if (timer) clearTimeout(timer);
      resolve({ stdout: '', stderr: '', code: 1 });
    });
  });
}

export const realExec: Exec = {
  run(cmd, args, opts = {}) {
    if (opts.interactive) {
      const child = nodeSpawn(cmd, args, {
        cwd: opts.cwd,
        env: opts.env ?? process.env,
        stdio: 'inherit',
      });
      return inheritedExit(child, opts.timeoutMs);
    }
    const child = nodeSpawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    // Always close stdin: with input when provided, with EOF otherwise.
    // Leaving stdin open hangs commands that read from it (gh prompts, editors, etc.).
    child.stdin?.end(opts.input ?? '');
    return buffered(child, opts.timeoutMs);
  },
  spawn(cmd, args, opts = {}) {
    if (opts.interactive) {
      const child = nodeSpawn(cmd, args, {
        cwd: opts.cwd,
        env: opts.env ?? process.env,
        stdio: 'inherit',
      });
      return { child, done: inheritedExit(child, opts.timeoutMs) };
    }
    const child = nodeSpawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdin?.end('');
    return { child, done: buffered(child, opts.timeoutMs) };
  },
};
