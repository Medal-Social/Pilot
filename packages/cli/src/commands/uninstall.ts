// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { render } from 'ink';
import React from 'react';
import { errorCodes, PilotError } from '../errors.js';
import { Uninstall } from '../screens/Uninstall.js';

export async function runUninstall() {
  const pilotDir = join(homedir(), '.pilot');

  if (!existsSync(pilotDir)) {
    throw new PilotError(errorCodes.UNINSTALL_NOT_INSTALLED);
  }

  render(React.createElement(Uninstall));
}
