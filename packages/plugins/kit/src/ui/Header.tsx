// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { Box, Text } from 'ink';

export interface HeaderProps {
  machine: string;
  os: string;
  osVersion: string;
  chip: 'Apple Silicon' | 'Intel';
  user: string;
}

export function Header(props: HeaderProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="#00E5CC" bold>
        kit · machine setup
      </Text>
      <Text>
        Machine <Text bold>{props.machine}</Text>
      </Text>
      <Text>
        System{' '}
        <Text bold>
          {props.os} {props.osVersion}
        </Text>{' '}
        · {props.chip}
      </Text>
      <Text>
        User <Text bold>{props.user}</Text>
      </Text>
    </Box>
  );
}
