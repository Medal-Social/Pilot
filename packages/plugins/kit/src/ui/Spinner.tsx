// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { Box, Text } from 'ink';

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export interface SpinnerProps {
  label: string;
  elapsedSeconds?: number;
  frame?: number;
  detail?: string;
}

function fmt(secs: number): string {
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, '0')}s`;
}

export function Spinner(props: SpinnerProps) {
  const f = FRAMES[(props.frame ?? 0) % FRAMES.length];
  return (
    <Box>
      <Text color="#00E5CC">{f}</Text>
      <Text> {props.label}</Text>
      {typeof props.elapsedSeconds === 'number' && (
        <Text color="#888888"> ({fmt(props.elapsedSeconds)})</Text>
      )}
      {props.detail ? <Text color="#888888"> · {props.detail}</Text> : null}
    </Box>
  );
}
