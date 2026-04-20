// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { homedir } from 'node:os';
import { join } from 'node:path';
import { render } from 'ink';
import React from 'react';
import { discoverPlugins } from '../plugins/discover.js';
import { Plugins } from '../screens/Plugins.js';
import { loadSettings } from '../settings.js';

export async function runPlugins() {
  const userDir = join(homedir(), '.pilot', 'plugins');
  const settings = loadSettings();

  const plugins = discoverPlugins({
    userDir,
    enabledState: settings.plugins,
  });

  render(React.createElement(Plugins, { plugins }));
}
