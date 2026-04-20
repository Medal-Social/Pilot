// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render, Text } from 'ink';
import React from 'react';
import { colors } from '../colors.js';
import { VERSION } from '../version.js';

export interface StatusOptions {
  json?: boolean;
}

export interface StatusInfo {
  pilot: string;
  node: string;
  platform: string;
  arch: string;
}

export async function runStatus(options: StatusOptions = {}) {
  if (options.json) {
    const info: StatusInfo = {
      pilot: VERSION,
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    };
    process.stdout.write(`${JSON.stringify(info, null, 2)}\n`);
    return;
  }

  render(React.createElement(Text, { color: colors.muted }, 'pilot status — coming soon'));
}
