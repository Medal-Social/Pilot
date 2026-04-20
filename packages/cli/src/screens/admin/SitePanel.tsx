// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Text } from 'ink';
import type { WorkspaceDetail } from '../../admin/types.js';
import { colors } from '../../colors.js';

interface SitePanelProps {
  workspace?: WorkspaceDetail;
}

export function SitePanel({ workspace }: SitePanelProps) {
  if (!workspace) {
    return (
      <Box paddingX={1}>
        <Text color={colors.muted}>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      <Box flexDirection="column">
        <Text color={colors.muted}>DOMAIN</Text>
        <Text bold color={colors.text}>
          {workspace.domain ?? 'No custom domain'}
        </Text>
      </Box>
      <Box gap={4}>
        <Box flexDirection="column">
          <Text color={colors.muted}>SSL</Text>
          {workspace.sslValid ? (
            <Box gap={1}>
              <Text color={colors.success}>●</Text>
              <Text color={colors.success}>Valid</Text>
            </Box>
          ) : (
            <Box gap={1}>
              <Text color={colors.error}>●</Text>
              <Text color={colors.error}>Expired</Text>
            </Box>
          )}
        </Box>
        <Box flexDirection="column">
          <Text color={colors.muted}>DNS</Text>
          {workspace.dnsConfigured ? (
            <Box gap={1}>
              <Text color={colors.success}>●</Text>
              <Text color={colors.success}>Configured</Text>
            </Box>
          ) : (
            <Box gap={1}>
              <Text color={colors.warning}>●</Text>
              <Text color={colors.warning}>Not configured</Text>
            </Box>
          )}
        </Box>
        <Box flexDirection="column">
          <Text color={colors.muted}>UPTIME</Text>
          <Text bold color={colors.text}>
            {workspace.uptime} days
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
