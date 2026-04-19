// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { Box, Text } from 'ink';
import type { WorkspaceDetail, WorkspaceStatus } from '../../admin/types.js';
import { colors } from '../../colors.js';

const statusDisplay: Record<WorkspaceStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: colors.success },
  trial: { label: 'Trial', color: colors.warning },
  suspended: { label: 'Suspended', color: colors.error },
  churned: { label: 'Churned', color: colors.muted },
};

interface SettingsPanelProps {
  workspace?: WorkspaceDetail;
}

export function SettingsPanel({ workspace }: SettingsPanelProps) {
  if (!workspace) {
    return (
      <Box paddingX={1}>
        <Text color={colors.muted}>Loading...</Text>
      </Box>
    );
  }

  const status = statusDisplay[workspace.status];

  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      <Box flexDirection="column">
        <Text color={colors.muted}>WORKSPACE</Text>
        <Text bold color={colors.text}>
          {workspace.name}
        </Text>
        <Text color={colors.muted}>ID: {workspace.id}</Text>
      </Box>
      <Box gap={4}>
        <Box flexDirection="column">
          <Text color={colors.muted}>STATUS</Text>
          <Text bold color={status.color}>
            {status.label}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text color={colors.muted}>PLAN</Text>
          <Text bold color={colors.primary}>
            {workspace.plan}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text color={colors.muted}>BILLING</Text>
          <Text bold color={colors.text}>
            ${workspace.mrr}/mo
          </Text>
        </Box>
      </Box>
      <Box flexDirection="column">
        <Text color={colors.muted}>DOMAIN</Text>
        <Text color={colors.text}>{workspace.domain ?? 'No custom domain configured'}</Text>
      </Box>
    </Box>
  );
}
