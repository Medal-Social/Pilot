// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { Box, Text } from 'ink';

export type StepStatus = 'pending' | 'running' | 'ok' | 'error';

const GLYPH: Record<StepStatus, string> = {
  pending: '○',
  running: '⠸',
  ok: '✓',
  error: '✗',
};

const COLOR: Record<StepStatus, string> = {
  pending: '#888888',
  running: '#F59E0B',
  ok: '#00E87B',
  error: '#FF3B3B',
};

export interface StepRowProps {
  status: StepStatus;
  label: string;
  detail?: string;
}

export function StepRow(props: StepRowProps) {
  return (
    <Box>
      <Text color={COLOR[props.status]}>{GLYPH[props.status]}</Text>
      <Text> {props.label}</Text>
      {props.detail ? <Text color="#888888"> · {props.detail}</Text> : null}
    </Box>
  );
}
