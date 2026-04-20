// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box } from 'ink';
import type React from 'react';
import { colors } from '../colors.js';

interface SplitPanelProps {
  sidebar: React.ReactNode;
  detail: React.ReactNode;
  sidebarWidth?: number;
}

export function SplitPanel({ sidebar, detail, sidebarWidth = 30 }: SplitPanelProps) {
  return (
    <Box flexGrow={1}>
      <Box
        flexDirection="column"
        width={sidebarWidth}
        borderStyle="single"
        borderLeft={false}
        borderTop={false}
        borderBottom={false}
        borderColor={colors.border}
      >
        {sidebar}
      </Box>
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {detail}
      </Box>
    </Box>
  );
}
