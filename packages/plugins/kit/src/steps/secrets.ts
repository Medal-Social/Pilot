// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { errorCodes, KitError } from '../errors.js';
import type { Step } from './types.js';

export const secretsStep: Step = {
  id: 'secrets',
  label: 'Secrets',
  async check() {
    return false;
  },
  async run(ctx) {
    const repoDir = ctx.env?.KIT_REPO_DIR;
    if (!repoDir) throw new KitError(errorCodes.KIT_CONFIG_NOT_FOUND, 'KIT_REPO_DIR not set');
    const script = join(repoDir, 'scripts', 'secrets-init.sh');
    if (!existsSync(script)) return;
    const machine = ctx.env?.KIT_MACHINE ?? '';
    const user = ctx.env?.USER ?? process.env.USER ?? '';
    const r = await ctx.exec.run('bash', [script, 'detect', machine, user]);
    if (r.code !== 0) throw new KitError(errorCodes.KIT_SECRETS_INIT_FAILED, r.stderr);
  },
};
