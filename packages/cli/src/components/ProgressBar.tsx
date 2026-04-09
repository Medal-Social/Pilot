import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../colors.js';

interface ProgressBarProps {
  progress: number;
  width?: number;
  label?: string;
}

export function ProgressBar({ progress, width = 40, label }: ProgressBarProps) {
  const filled = Math.round(progress * width);
  const empty = width - filled;
  return (
    <Box flexDirection="column" gap={0}>
      <Text>
        <Text color={colors.primary}>{'█'.repeat(filled)}</Text>
        <Text color={colors.border}>{'░'.repeat(empty)}</Text>
      </Text>
      {label && <Text color={colors.muted}>{label}</Text>}
    </Box>
  );
}
