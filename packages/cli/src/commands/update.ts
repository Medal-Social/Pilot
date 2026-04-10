import { createRequire } from 'node:module';
import { render } from 'ink';
import React from 'react';
import { Update } from '../screens/Update.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

export async function runUpdate() {
  render(React.createElement(Update, { currentVersion: pkg.version }));
}
