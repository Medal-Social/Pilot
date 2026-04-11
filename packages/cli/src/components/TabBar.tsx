// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { Box, Text } from 'ink';
import { colors } from '../colors.js';
import type { Tab, TabId } from '../types.js';

interface TabBarProps {
  tabs: Tab[];
  activeTab: TabId;
  onSelect?: (id: TabId) => void;
}

export function TabBar({ tabs, activeTab }: TabBarProps) {
  return (
    <Box
      gap={2}
      paddingX={1}
      borderStyle="single"
      borderTop={false}
      borderLeft={false}
      borderRight={false}
      borderColor={colors.border}
    >
      {tabs.map((tab) => (
        <Text
          key={tab.id}
          color={tab.id === activeTab ? colors.primary : colors.muted}
          bold={tab.id === activeTab}
        >
          {tab.label}
        </Text>
      ))}
    </Box>
  );
}
