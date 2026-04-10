import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../colors.js';

interface StatusBarProps {
  items: Array<{ label: string; color?: string }>;
}

export function StatusBar({ items }: StatusBarProps) {
  return (
    <Box
      borderStyle="single"
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderColor={colors.border}
    >
      <Box gap={2} paddingX={1}>
        {items.map((item, i) => (
          <Text key={i} color={item.color ?? colors.muted}>
            {item.label}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
