// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { Box, Text, useInput } from 'ink';
import { colors } from '../colors.js';
import { Header } from '../components/Header.js';
import { defaultCrew } from '../crew/members.js';

interface WelcomeProps {
  onContinue: () => void;
}

export function Welcome({ onContinue }: WelcomeProps) {
  useInput((_input, key) => {
    if (key.return) onContinue();
  });

  return (
    <Box flexDirection="column" alignItems="center" gap={1} padding={2}>
      <Header size="large" />
      <Text bold color={colors.text}>
        Welcome aboard, Captain.
      </Text>
      <Text color={colors.muted}>
        You have a full AI crew ready to work. Here's who's on board:
      </Text>
      <Box flexDirection="column" gap={0} marginTop={1}>
        {defaultCrew.map((member) => (
          <Box key={member.role} gap={1}>
            <Text color={member.color}>●</Text>
            <Text bold color={colors.text}>
              {member.role}
            </Text>
            <Text color={colors.muted}>— {member.description}</Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color={colors.muted}>
          Press{' '}
          <Text bold color={colors.text}>
            Enter
          </Text>{' '}
          to start flying
        </Text>
      </Box>
    </Box>
  );
}
