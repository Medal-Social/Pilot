// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { Box, Text } from 'ink';

export interface CompletionProps {
  ok: boolean;
  machine: string;
  elapsedSeconds: number;
  error?: string;
}

function fmt(secs: number): string {
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, '0')}s`;
}

export function Completion(props: CompletionProps) {
  if (props.ok) {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color="#00E87B" bold>
          ✓ {props.machine} is ready
        </Text>
        <Text color="#888888">Completed in {fmt(props.elapsedSeconds)}</Text>
        <Text color="#888888">Open a new terminal to load your shell config.</Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="#FF3B3B" bold>
        ✗ Setup failed
      </Text>
      {props.error ? <Text>{props.error}</Text> : null}
      <Text color="#888888">Stopped after {fmt(props.elapsedSeconds)}</Text>
    </Box>
  );
}
