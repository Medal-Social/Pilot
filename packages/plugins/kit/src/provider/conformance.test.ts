// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { describe, it } from 'vitest';
import { runConformanceSuite } from './conformance.js';
import { LocalProvider } from './local.js';

describe('LocalProvider conformance', () => {
  it('passes the FleetProvider conformance suite', async () => {
    await runConformanceSuite(new LocalProvider());
  });
});
