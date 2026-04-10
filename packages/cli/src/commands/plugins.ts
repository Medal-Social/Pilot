import React from 'react';
import { render } from 'ink';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { Plugins } from '../screens/Plugins.js';
import { discoverPlugins } from '../plugins/discover.js';
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
