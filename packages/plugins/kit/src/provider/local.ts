// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import type {
  FleetProvider,
  ProviderContext,
  RequiredApps,
  RequiredPlugins,
  SecurityCheck,
  StatusReport,
} from './types.js';

export class LocalProvider implements FleetProvider {
  readonly id = 'local';
  readonly displayName = 'Local (no fleet)';

  async getRequiredApps(_ctx: ProviderContext): Promise<RequiredApps> {
    return { casks: [], brews: [], source: 'local' };
  }

  async getRequiredPlugins(_ctx: ProviderContext): Promise<RequiredPlugins> {
    return { plugins: [], source: 'local' };
  }

  async getSecurityBaseline(_ctx: ProviderContext): Promise<SecurityCheck[]> {
    return [];
  }

  async reportStatus(_ctx: ProviderContext, _report: StatusReport): Promise<void> {
    // no-op
  }
}
