import React from 'react';
import { render, Text } from 'ink';
import { colors } from '../colors.js';

export async function runCrew() {
  render(
    React.createElement(Text, { color: colors.muted }, 'pilot crew — coming soon')
  );
}
