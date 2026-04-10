import React from 'react';
import { Box, Text } from 'ink';
import { Header } from '../components/Header.js';
import { colors } from '../colors.js';

export function Repl() {
  return (
    <Box flexDirection="column" gap={1}>
      <Header subtitle="Your AI crew, ready to fly." />
      <Text color={colors.muted}>Type a message or /help for commands</Text>
    </Box>
  );
}
