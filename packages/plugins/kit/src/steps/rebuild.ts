// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { errorCodes, KitError } from '../errors.js';
import type { Step, StepContext } from './types.js';

function getMachineType(ctx: StepContext): string {
  const type = ctx.env?.KIT_MACHINE_TYPE;
  if (!type) throw new KitError(errorCodes.KIT_CONFIG_NOT_FOUND, 'KIT_MACHINE_TYPE not set');
  return type;
}

function getMachine(ctx: StepContext): string {
  const machine = ctx.env?.KIT_MACHINE;
  if (!machine) throw new KitError(errorCodes.KIT_CONFIG_NOT_FOUND, 'KIT_MACHINE not set');
  return machine;
}

function getRepoDir(ctx: StepContext): string {
  const dir = ctx.env?.KIT_REPO_DIR;
  if (!dir) throw new KitError(errorCodes.KIT_CONFIG_NOT_FOUND, 'KIT_REPO_DIR not set');
  return dir;
}

export const rebuildStep: Step = {
  id: 'rebuild',
  label: 'Rebuild',
  async check() {
    return false;
  },
  async run(ctx) {
    const type = getMachineType(ctx);
    const machine = getMachine(ctx);
    const repoDir = getRepoDir(ctx);

    const command = type === 'darwin' ? 'darwin-rebuild' : 'nixos-rebuild';
    const r = await ctx.exec.run('sudo', [command, 'switch', '--flake', `.#${machine}`], {
      cwd: repoDir,
    });
    if (r.code !== 0) throw new KitError(errorCodes.KIT_REBUILD_FAILED, r.stderr);
  },
};
