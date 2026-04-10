import { Box, Text } from 'ink';
import React from 'react';
import { colors } from '../colors.js';
import type { StepStatus } from '../types.js';

const icons: Record<StepStatus, { char: string; color: string }> = {
  done: { char: '✓', color: colors.success },
  active: { char: '⠸', color: colors.warning },
  waiting: { char: '○', color: colors.muted },
  error: { char: '✗', color: colors.error },
};

interface StepProps {
  label: string;
  status: StepStatus;
  detail?: string;
}

export function Step({ label, status, detail }: StepProps) {
  const icon = icons[status];
  return (
    <Box gap={1}>
      <Text color={icon.color}>{icon.char}</Text>
      <Text color={status === 'waiting' ? colors.muted : colors.text}>{label}</Text>
      {detail && <Text color={colors.muted}>{detail}</Text>}
    </Box>
  );
}
