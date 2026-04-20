// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { Box, Text } from 'ink';
import type { SiteStatus, WorkspaceDetail } from '../../admin/types.js';
import { colors } from '../../colors.js';

const siteStatusDisplay: Record<SiteStatus, { label: string; color: string | undefined }> = {
  live: { label: 'Live', color: colors.success },
  setup: { label: 'Setup', color: colors.warning },
  down: { label: 'Down', color: colors.error },
  building: { label: 'Building', color: colors.info },
};

interface OverviewPanelProps {
  workspace?: WorkspaceDetail;
}

export function OverviewPanel({ workspace }: OverviewPanelProps) {
  if (!workspace) {
    return (
      <Box paddingX={1}>
        <Text color={colors.muted}>Loading...</Text>
      </Box>
    );
  }

  const site = siteStatusDisplay[workspace.siteStatus];
  const trendSign = workspace.visitsTrend >= 0 ? '↑' : '↓';

  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      <Box gap={4}>
        <Box flexDirection="column">
          <Text color={colors.muted}>SITE STATUS</Text>
          <Text bold color={site.color}>
            {site.label}
          </Text>
          {workspace.domain && <Text color={colors.muted}>{workspace.domain}</Text>}
        </Box>
        <Box flexDirection="column">
          <Text color={colors.muted}>SCHEDULED POSTS</Text>
          <Text bold color={colors.primary}>
            {workspace.scheduledPosts}
          </Text>
          {workspace.nextPostAt && <Text color={colors.muted}>next: {workspace.nextPostAt}</Text>}
        </Box>
        <Box flexDirection="column">
          <Text color={colors.muted}>THIS MONTH</Text>
          <Text bold color={colors.text}>
            {workspace.monthlyVisits}
          </Text>
          <Text color={workspace.visitsTrend >= 0 ? colors.success : colors.error}>
            {trendSign} {Math.abs(workspace.visitsTrend)}% vs last month
          </Text>
        </Box>
      </Box>
      <Box flexDirection="column">
        <Text color={colors.muted}>RECENT ACTIVITY</Text>
        {workspace.recentActivity.map((item) => (
          <Box key={item.timestamp} justifyContent="space-between">
            <Text color={colors.text}>{item.description}</Text>
            <Text color={colors.muted}>{item.timestamp}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
