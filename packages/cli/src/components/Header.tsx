import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../colors.js';

const LOGO_SMALL = '✈ pilot | medal social';

interface HeaderProps {
  size?: 'small' | 'medium' | 'large';
  subtitle?: string;
}

export function Header({ size = 'medium', subtitle }: HeaderProps) {
  return (
    <Box flexDirection="column" alignItems="center" gap={0}>
      <Text color={colors.primary} bold>
        {size === 'small' ? '✈ pilot' : LOGO_SMALL}
      </Text>
      {subtitle && <Text color={colors.muted}>{subtitle}</Text>}
    </Box>
  );
}
