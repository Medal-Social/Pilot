import React from 'react';
import { render } from 'ink';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Plugins } from '../screens/Plugins.js';
import { discoverPlugins } from '../plugins/discover.js';
import { loadSettings } from '../settings.js';

export async function runPlugins() {
  const cliRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const bundledDir = join(cliRoot, '..', 'plugins');
  const userDir = join(homedir(), '.pilot', 'plugins');
  const settings = loadSettings();

  const plugins = discoverPlugins({
    bundledDir,
    userDir,
    enabledState: settings.plugins,
  });

  render(React.createElement(Plugins, { plugins }));
}
