// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { Box, Text } from 'ink';
import type { ContentStats } from '../../admin/types.js';
import { colors } from '../../colors.js';

interface ContentPanelProps {
  stats?: ContentStats;
}

export function ContentPanel({ stats }: ContentPanelProps) {
  if (!stats) {
    return (
      <Box paddingX={1}>
        <Text color={colors.muted}>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      <Box gap={4}>
        <Box flexDirection="column">
          <Text color={colors.muted}>Published</Text>
          <Text bold color={colors.success}>
            {stats.published}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text color={colors.muted}>Drafts</Text>
          <Text bold color={colors.warning}>
            {stats.drafts}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text color={colors.muted}>Scheduled</Text>
          <Text bold color={colors.info}>
            {stats.scheduled}
          </Text>
        </Box>
      </Box>
      <Box flexDirection="column">
        <Text color={colors.muted}>DATASETS</Text>
        {stats.datasets.map((ds) => (
          <Box key={ds.name} gap={1}>
            <Text color={colors.text}>{ds.name}</Text>
            <Text color={colors.muted}>· {ds.documentCount} documents</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
