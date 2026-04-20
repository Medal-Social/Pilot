// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Text } from 'ink';
import type React from 'react';
import { colors } from '../colors.js';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ title, children, footer }: ModalProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.border}
      paddingX={2}
      paddingY={1}
    >
      <Box justifyContent="space-between">
        <Text bold color={colors.text}>
          {title}
        </Text>
        <Text color={colors.muted}>esc</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {children}
      </Box>
      {footer && (
        <Box marginTop={1} justifyContent="flex-end">
          {footer}
        </Box>
      )}
    </Box>
  );
}
