import { render, Text } from 'ink';
import React from 'react';
import { colors } from '../colors.js';

export async function runStatus() {
  render(React.createElement(Text, { color: colors.muted }, 'pilot status — coming soon'));
}
