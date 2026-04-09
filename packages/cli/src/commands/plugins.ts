import React from 'react';
import { render, Text } from 'ink';
import { colors } from '../colors.js';

export async function runPlugins() {
  render(
    React.createElement(Text, { color: colors.muted }, 'pilot plugins — coming soon')
  );
}
