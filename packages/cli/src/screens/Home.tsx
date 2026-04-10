import React from 'react';
import { Box, Text } from 'ink';
import { Header } from '../components/Header.js';
import { StatusBar } from '../components/StatusBar.js';
import { colors } from '../colors.js';

export function Home() {
  return (
    <Box flexDirection="column" height="100%">
      <Box flexDirection="column" flexGrow={1} alignItems="center" justifyContent="center" gap={1}>
        <Header size="medium" />
        <Box
          borderStyle="single"
          borderColor={colors.border}
          paddingX={2}
          paddingY={0}
          width={50}
        >
          <Text color={colors.muted}>What would you like to work on?</Text>
        </Box>
      </Box>
      <Box flexDirection="column">
        <Text color={colors.muted}>
          <Text color={colors.warning}>● Tip</Text> Type /help to see all available commands
        </Text>
        <StatusBar
          items={[
            { label: '● ready', color: colors.success },
            { label: 'pilot · content' },
          ]}
        />
      </Box>
    </Box>
  );
}
