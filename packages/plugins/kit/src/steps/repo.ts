// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { errorCodes, KitError } from '../errors.js';
import type { Step, StepContext } from './types.js';

function repoDir(ctx: StepContext): string {
  const d = ctx.env?.KIT_REPO_DIR;
  if (!d) throw new KitError(errorCodes.KIT_CONFIG_NOT_FOUND, 'KIT_REPO_DIR not set');
  return d;
}

export const repoStep: Step = {
  id: 'repo',
  label: 'kit repository',
  async check(ctx) {
    if (!ctx) return false;
    return existsSync(join(repoDir(ctx), '.git'));
  },
  async run(ctx) {
    const dir = repoDir(ctx);
    if (existsSync(join(dir, '.git'))) {
      const r = await ctx.exec.run('git', ['-C', dir, 'pull', '--ff-only']);
      if (r.code !== 0) throw new KitError(errorCodes.KIT_REPO_PULL_FAILED, r.stderr);
      return;
    }
    const url = ctx.env?.KIT_REPO_URL;
    if (!url) throw new KitError(errorCodes.KIT_CONFIG_NOT_FOUND, 'KIT_REPO_URL not set');
    await ctx.exec.run('mkdir', ['-p', dirname(dir)]);
    const r = await ctx.exec.run('git', ['clone', url, dir]);
    if (r.code !== 0) throw new KitError(errorCodes.KIT_REPO_CLONE_FAILED, r.stderr);
  },
};
