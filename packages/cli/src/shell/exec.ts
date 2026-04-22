// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// This is the single authoritative place for subprocess execution in the CLI package.
// All child_process usage must go through this interface — never import child_process
// directly elsewhere.

import { spawn } from 'node:child_process';

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface Exec {
  run(
    cmd: string,
    args: string[],
    opts?: { cwd?: string; env?: NodeJS.ProcessEnv }
  ): Promise<ExecResult>;
}

export const realExec: Exec = {
  run(cmd, args, opts = {}) {
    return new Promise((resolve) => {
      const child = spawn(cmd, args, {
        cwd: opts.cwd,
        env: opts.env ?? process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (b: Buffer) => {
        stdout += b.toString();
      });
      child.stderr.on('data', (b: Buffer) => {
        stderr += b.toString();
      });
      child.on('close', (code) => resolve({ stdout, stderr, code: code ?? 0 }));
      child.on('error', () => resolve({ stdout, stderr, code: 1 }));
    });
  },
};
