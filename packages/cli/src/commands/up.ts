import { Text, render } from 'ink';
import React from 'react';
import { colors } from '../colors.js';

export async function runUp(template?: string) {
  render(React.createElement(Text, { color: colors.muted }, 'pilot up — coming soon'));
}
