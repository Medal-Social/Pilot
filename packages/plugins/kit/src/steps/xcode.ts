// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { errorCodes, KitError } from '../errors.js';
import type { Step, StepContext } from './types.js';

export const xcodeStep: Step = {
  id: 'xcode',
  label: 'Xcode Command Line Tools',
  async check(ctx?: StepContext) {
    if (!ctx) return false;
    const r = await ctx.exec.run('xcode-select', ['-p']);
    return r.code === 0;
  },
  async run(ctx) {
    await ctx.exec.run('touch', [
      '/tmp/.com.apple.dt.CommandLineTools.installondemand.in-progress',
    ]);
    const list = await ctx.exec.run('softwareupdate', ['-l']);
    const match = list.stdout.match(/\* Label: (Command Line Tools for Xcode[^\n]*)/);
    if (!match) {
      throw new KitError(errorCodes.KIT_XCODE_INSTALL_FAILED, 'no CLT label found');
    }
    const label = match[1].trim();
    const install = await ctx.exec.run('softwareupdate', ['-i', label]);
    if (install.code !== 0) {
      throw new KitError(errorCodes.KIT_XCODE_INSTALL_FAILED, install.stderr);
    }
  },
};
