// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { errorCodes, KitError } from '../errors.js';
import type { Step } from './types.js';

export const rosettaStep: Step = {
  id: 'rosetta',
  label: 'Rosetta 2',
  async check(ctx) {
    if (!ctx) return false;
    const r = await ctx.exec.run('/usr/bin/pgrep', ['oahd']);
    return r.code === 0;
  },
  async run(ctx) {
    const r = await ctx.exec.run('softwareupdate', ['--install-rosetta', '--agree-to-license']);
    if (r.code !== 0) throw new KitError(errorCodes.KIT_ROSETTA_INSTALL_FAILED, r.stderr);
  },
};
