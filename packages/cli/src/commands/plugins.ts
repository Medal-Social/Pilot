import React from 'react';
import { render } from 'ink';
import { Plugins } from '../screens/Plugins.js';

export async function runPlugins() {
  render(React.createElement(Plugins));
}
