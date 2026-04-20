// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Text } from 'ink';
import type { WorkspaceDetail } from '../../admin/types.js';
import { colors } from '../../colors.js';

interface AnalyticsPanelProps {
  workspace?: WorkspaceDetail;
}

export function AnalyticsPanel({ workspace }: AnalyticsPanelProps) {
  if (!workspace) {
    return (
      <Box paddingX={1}>
        <Text color={colors.muted}>Loading...</Text>
      </Box>
    );
  }

  const trendPositive = workspace.visitsTrend >= 0;
  const trendIcon = trendPositive ? '↑' : '↓';
  const trendColor = trendPositive ? colors.success : colors.error;

  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      <Box gap={4}>
        <Box flexDirection="column">
          <Text color={colors.muted}>MONTHLY VISITS</Text>
          <Text bold color={colors.text}>
            {workspace.monthlyVisits.toLocaleString()}
          </Text>
          <Text color={trendColor}>
            {trendIcon} {Math.abs(workspace.visitsTrend)}% vs last month
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text color={colors.muted}>UPTIME</Text>
          <Text bold color={colors.text}>
            {workspace.uptime} days
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text color={colors.muted}>PLAN</Text>
          <Text bold color={colors.primary}>
            {workspace.plan}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
