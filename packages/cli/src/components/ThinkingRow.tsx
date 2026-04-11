import { Box, Text } from 'ink';
import { colors } from '../colors.js';

interface ThinkingRowProps {
  tool: string;
}

export function ThinkingRow({ tool }: ThinkingRowProps) {
  return (
    <Box gap={1}>
      <Text color={colors.primary}>◆</Text>
      <Text color={colors.muted}>{tool}</Text>
    </Box>
  );
}
