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
    child.stdout?.on('data', (b) => {
      stdout += b.toString();
    });
    child.stderr?.on('data', (b) => {
      stderr += b.toString();
    });
    const timer =
      timeoutMs !== undefined
        ? setTimeout(() => {
            child.kill('SIGKILL');
          }, timeoutMs)
        : null;
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ stdout, stderr, code: code ?? 0 });
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
