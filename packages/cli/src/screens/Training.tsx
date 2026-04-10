import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { SplitPanel } from '../components/SplitPanel.js';
import { TabBar } from '../components/TabBar.js';
import { StatusBar } from '../components/StatusBar.js';
import { colors } from '../colors.js';
import type { Tab } from '../types.js';
import type { KnowledgeSource } from '../training/types.js';

const SOURCES: KnowledgeSource[] = [
  {
    id: 'sanity',
    type: 'sanity',
    name: 'Sanity CMS',
    description: 'Auto-syncing product catalog, blog posts, and pages',
    connected: true,
    lastSync: '12m ago',
    documentCount: 47,
  },
  {
    id: 'slack',
    type: 'slack',
    name: 'Slack',
    description: '#support, #feedback',
    connected: true,
    documentCount: 2,
  },
  {
    id: 'manual',
    type: 'manual',
    name: 'Manual articles',
    description: '8 articles uploaded',
    connected: true,
    documentCount: 8,
  },
];

const TABS: Tab[] = [
  { id: 'sources', label: 'Sources' },
  { id: 'articles', label: 'Articles' },
  { id: 'runs', label: 'Runs' },
];

export function Training() {
  const [activeTab, setActiveTab] = useState('sources');
  const [selected, setSelected] = useState(0);
  const current = SOURCES[selected];

  return (
    <Box flexDirection="column" height="100%">
      <Box paddingX={1} flexDirection="column">
        <Text bold color={colors.text}>Training</Text>
        <Text color={colors.muted}>Teach your crew about your brand, products, and voice</Text>
      </Box>
      <TabBar tabs={TABS} activeTab={activeTab} />
      <SplitPanel
        sidebarWidth={28}
        sidebar={
          <Box flexDirection="column">
            <Text color={colors.primary} bold>
              {' '}CONNECTED SOURCES
            </Text>
            {SOURCES.map((s, i) => (
              <Box key={s.id} flexDirection="column" paddingX={1}>
                <Text bold color={i === selected ? colors.text : colors.muted}>
                  {s.name}
                </Text>
                <Text color={colors.success} dimColor>● connected</Text>
              </Box>
            ))}
            <Box marginTop={1} paddingX={1}>
              <Text color={colors.primary}>+ Connect new source</Text>
            </Box>
            <Box flexGrow={1} />
            <Box
              paddingX={1}
              paddingY={0}
              marginX={1}
              borderStyle="round"
              borderColor={colors.primary}
              justifyContent="center"
            >
              <Text bold color={colors.text}>Start Training Run</Text>
            </Box>
          </Box>
        }
        detail={
          current ? (
            <Box flexDirection="column" gap={1}>
              <Text bold color={colors.text}>{current.name}</Text>
              <Text color={colors.muted}>{current.description}</Text>
              <Box
                flexDirection="column"
                borderStyle="single"
                borderColor={colors.border}
                paddingX={1}
              >
                <Text color={colors.primary} bold>STATUS</Text>
                <Text color={colors.text}>
                  Documents: {current.documentCount}
                  {'  '}Last sync: {current.lastSync ?? 'never'}
                </Text>
              </Box>
              <Text color={colors.primary} bold>ACTIONS</Text>
              <Box
                flexDirection="column"
                borderStyle="single"
                borderColor={colors.border}
                paddingX={1}
              >
                <Text bold color={colors.text}>Sync now</Text>
                <Text color={colors.muted}>Pull latest documents</Text>
              </Box>
              <Box
                flexDirection="column"
                borderStyle="single"
                borderColor={colors.border}
                paddingX={1}
              >
                <Text bold color={colors.text}>Configure filters</Text>
                <Text color={colors.muted}>Choose document types to include</Text>
              </Box>
              <Box
                flexDirection="column"
                borderStyle="single"
                borderColor={colors.border}
                paddingX={1}
              >
                <Text bold color={colors.error}>Disconnect source</Text>
                <Text color={colors.muted}>Remove from knowledge base</Text>
              </Box>
            </Box>
          ) : null
        }
      />
      <StatusBar
        items={[
          { label: '● 3 sources', color: colors.success },
          { label: '12 articles' },
          { label: 'Last trained: 2h ago' },
          { label: 'pilot training' },
        ]}
      />
    </Box>
  );
}
