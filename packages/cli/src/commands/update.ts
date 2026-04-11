import { render } from 'ink';
import React from 'react';
import { Update } from '../screens/Update.js';

const VERSION = '0.1.5';

export async function runUpdate() {
  render(React.createElement(Update, { currentVersion: VERSION }));
}
