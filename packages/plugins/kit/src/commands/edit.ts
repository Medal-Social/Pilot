// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { errorCodes, KitError } from '../errors.js';
import type { Exec } from '../shell/exec.js';

const FALLBACKS = ['zed', 'code', 'cursor', 'nvim', 'vim', 'nano'];

export function resolveEditor(
  env: NodeJS.ProcessEnv,
  available: string[] = FALLBACKS
): string | null {
  if (env.KIT_EDITOR) return env.KIT_EDITOR;
  if (env.VISUAL) return env.VISUAL;
  if (env.EDITOR) return env.EDITOR;
  return available[0] ?? null;
}

export interface RunEditOpts {
  env: NodeJS.ProcessEnv;
  available?: string[];
  exec: Exec;
}

export async function runEdit(filePath: string, opts: RunEditOpts): Promise<void> {
  const editor = resolveEditor(opts.env, opts.available);
  if (!editor) {
    throw new KitError(errorCodes.KIT_NO_EDITOR, FALLBACKS.join(', '));
  }
  const result = await opts.exec.run(editor, [filePath]);
  if (result.code !== 0) {
    throw new KitError(
      errorCodes.KIT_NO_EDITOR,
      `${editor} exited with code ${result.code}${result.stderr ? `: ${result.stderr.trim()}` : ''}`
    );
  }
}
