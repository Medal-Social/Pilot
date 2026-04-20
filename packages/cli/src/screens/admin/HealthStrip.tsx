// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { Box, Text } from 'ink';
import type { QuickStats, ServiceHealth, ServiceStatus } from '../../admin/types.js';
import { colors } from '../../colors.js';

const statusColor: Record<ServiceStatus, string | undefined> = {
  healthy: colors.success,
  warning: colors.warning,
  critical: colors.error,
  idle: colors.muted,
};

interface HealthStripProps {
  services: ServiceHealth[];
  stats?: QuickStats;
}

function formatMrr(mrr: number): string {
  if (mrr >= 1000) return `$${(mrr / 1000).toFixed(1)}k`;
  return `$${mrr}`;
}

export function HealthStrip({ services, stats }: HealthStripProps) {
  return (
    <Box paddingX={1} gap={2}>
      <Box gap={2} flexGrow={1}>
        {services.map((service) => (
          <Box key={service.name} gap={1}>
            <Text color={statusColor[service.status]}>●</Text>
            <Text color={colors.muted}>{service.name.toUpperCase()}</Text>
          </Box>
        ))}
      </Box>
      {stats && (
        <Box gap={2}>
          <Box gap={1}>
            <Text bold color={colors.primary}>
              {stats.totalWorkspaces}
            </Text>
            <Text color={colors.muted}>workspaces</Text>
          </Box>
          <Box gap={1}>
            <Text bold color={colors.primary}>
              {stats.liveSites}
            </Text>
            <Text color={colors.muted}>live</Text>
          </Box>
          {stats.warnings > 0 && (
            <Box gap={1}>
              <Text bold color={colors.warning}>
                {stats.warnings}
              </Text>
              <Text color={colors.muted}>warning{stats.warnings !== 1 ? 's' : ''}</Text>
            </Box>
          )}
          <Box gap={1}>
            <Text bold color={colors.success}>
              {formatMrr(stats.mrr)}
            </Text>
            <Text color={colors.muted}>MRR</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
