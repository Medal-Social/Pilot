// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';
import { errorCodes, KitError } from '../errors.js';
import type { Exec } from '../shell/exec.js';

const FALLBACKS = ['zed', 'code', 'cursor', 'nvim', 'vim', 'nano'];

/* v8 ignore start */
function onPath(bin: string): boolean {
  try {
    execFileSync('which', [bin], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
/* v8 ignore stop */

export function resolveEditor(
  env: NodeJS.ProcessEnv,
  available: string[] = FALLBACKS,
  probe: (cmd: string) => boolean = onPath
): string | null {
  if (env.KIT_EDITOR) return env.KIT_EDITOR;
  if (env.VISUAL) return env.VISUAL;
  if (env.EDITOR) return env.EDITOR;
  return available.find(probe) ?? null;
}

export interface RunEditOpts {
  env: NodeJS.ProcessEnv;
  available?: string[];
  probe?: (cmd: string) => boolean;
  exec: Exec;
}

export async function runEdit(filePath: string, opts: RunEditOpts): Promise<void> {
  const probe = opts.probe ?? onPath;
  const editor = resolveEditor(opts.env, opts.available, probe);
  if (!editor) {
    throw new KitError(errorCodes.KIT_NO_EDITOR, FALLBACKS.join(', '));
  }
  // Split "code --wait" or "nvim -u /path/init.lua" into cmd + trailing args.
  const [cmd, ...editorArgs] = editor.trim().split(/\s+/);
  // Editors need a real TTY (vim/nvim/zed/code all draw their own UI).
  // Interactive mode attaches the child to the parent's stdio directly.
  const result = await opts.exec.run(cmd, [...editorArgs, filePath], { interactive: true });
  if (result.code !== 0) {
    throw new KitError(
      errorCodes.KIT_NO_EDITOR,
      `${editor} exited with code ${result.code}${result.stderr ? `: ${result.stderr.trim()}` : ''}`
    );
  }
}
