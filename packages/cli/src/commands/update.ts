import React from 'react';
import { render } from 'ink';
import { createRequire } from 'module';
import { Update } from '../screens/Update.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

export async function runUpdate() {
  render(React.createElement(Update, { currentVersion: pkg.version }));
}
