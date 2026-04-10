import { Text, render } from 'ink';
import React from 'react';
import { colors } from '../colors.js';

export async function runCrew() {
  render(React.createElement(Text, { color: colors.muted }, 'pilot crew — coming soon'));
}
