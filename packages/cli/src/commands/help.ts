import { render, Text } from 'ink';
import React from 'react';
import { colors } from '../colors.js';

export async function runHelp() {
  render(React.createElement(Text, { color: colors.muted }, 'pilot help — coming soon'));
}
