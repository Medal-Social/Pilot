import React from 'react';
import { render } from 'ink';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { Uninstall } from '../screens/Uninstall.js';
import { PilotError, errorCodes } from '../errors.js';

export async function runUninstall() {
  const pilotDir = join(homedir(), '.pilot');

  if (!existsSync(pilotDir)) {
    throw new PilotError(errorCodes.UNINSTALL_NOT_INSTALLED);
  }

  render(React.createElement(Uninstall));
}
