// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { errorCodes, KitError } from '../errors.js';
import type { Step } from './types.js';

const INSTALLER = 'https://install.determinate.systems/nix';

export const nixStep: Step = {
  id: 'nix',
  label: 'Nix',
  async check(ctx) {
    if (!ctx) return false;
    const r = await ctx.exec.run('nix', ['--version']);
    return r.code === 0;
  },
  async run(ctx) {
    const dl = await ctx.exec.run('curl', [
      '--proto',
      '=https',
      '--tlsv1.2',
      '-sSf',
      '-L',
      INSTALLER,
    ]);
    if (dl.code !== 0) throw new KitError(errorCodes.KIT_NIX_INSTALL_FAILED, dl.stderr);
    const install = await ctx.exec.run('sh', ['-s', '--', 'install', '--no-confirm'], {
      input: dl.stdout,
    });
    if (install.code !== 0) throw new KitError(errorCodes.KIT_NIX_INSTALL_FAILED, install.stderr);
  },
};
