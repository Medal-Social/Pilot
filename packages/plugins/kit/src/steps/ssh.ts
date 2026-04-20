// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { errorCodes, KitError } from '../errors.js';
import type { Step, StepContext } from './types.js';

function homeFromCtx(ctx: StepContext): string {
  return ctx.env?.HOME ?? process.env.HOME ?? '';
}

export const sshStep: Step = {
  id: 'ssh',
  label: 'SSH key',
  async check(ctx) {
    if (!ctx) return false;
    const path = join(homeFromCtx(ctx), '.ssh', 'id_ed25519');
    return existsSync(path);
  },
  async run(ctx) {
    const home = homeFromCtx(ctx);
    const machine = ctx.env?.KIT_MACHINE ?? 'kit-machine';
    await ctx.exec.run('mkdir', ['-p', join(home, '.ssh')]);
    const r = await ctx.exec.run('ssh-keygen', [
      '-t',
      'ed25519',
      '-C',
      machine,
      '-f',
      join(home, '.ssh', 'id_ed25519'),
      '-N',
      '',
    ]);
    if (r.code !== 0) throw new KitError(errorCodes.KIT_SSH_KEYGEN_FAILED, r.stderr);
  },
};
