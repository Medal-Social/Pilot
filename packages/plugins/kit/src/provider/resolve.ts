// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LocalProvider } from './local.js';
import type { FleetProvider } from './types.js';

// biome-ignore lint/suspicious/noEmptyInterface: reserved for v1.1
export interface ResolveOpts {}

export function resolveProvider(_opts: ResolveOpts = {}): FleetProvider {
  return new LocalProvider();
}
