import React from 'react';
import { render } from 'ink';
import { Update } from '../screens/Update.js';

export async function runUpdate() {
  render(React.createElement(Update));
}
