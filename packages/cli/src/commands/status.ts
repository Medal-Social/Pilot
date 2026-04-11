import { render, Text } from 'ink';
import React from 'react';
import os from 'os';
import { colors } from '../colors.js';
import { VERSION } from '../version.js';

export interface StatusOptions {
  json?: boolean;
}

export async function runStatus(options: StatusOptions = {}) {
  const status = {
    pilot: {
      version: VERSION,
    },
    system: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
    },
    node: {
      version: process.version,
    },
  };

  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  render(React.createElement(Text, { color: colors.muted }, 'pilot status — coming soon'));
}
