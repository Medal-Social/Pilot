import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { SplitPanel } from '../components/SplitPanel.js';
import { TabBar } from '../components/TabBar.js';
import { StatusBar } from '../components/StatusBar.js';
import { colors } from '../colors.js';
import type { Tab } from '../types.js';

interface PluginItem {
  name: string;
  description: string;
  installed: boolean;
  provides: string[];
}

const PLUGINS: PluginItem[] = [
  {
    name: 'kit',
    description: 'Machine config & Nix management',
    installed: true,
    provides: ['pilot up', 'pilot update', 'pilot status'],
  },
  {
    name: 'sanity',
    description: 'CMS content management',
    installed: true,
    provides: ['/content', '/schema', '/publish'],
  },
  {
    name: 'pencil',
    description: 'Design tool integration',
    installed: false,
    provides: ['/design', 'pencil MCP'],
  },
];

const TABS: Tab[] = [
  { id: 'all', label: 'All' },
  { id: 'installed', label: 'Installed' },
  { id: 'available', label: 'Available' },
];

export function Plugins() {
  const [activeTab, setActiveTab] = useState('all');
  const [selected, setSelected] = useState(0);

  const filtered = PLUGINS.filter((p) => {
    if (activeTab === 'installed') return p.installed;
    if (activeTab === 'available') return !p.installed;
    return true;
  });

  const current = filtered[selected];

  return (
    <Box flexDirection="column" height="100%">
      <Box paddingX={1} paddingY={0} flexDirection="column">
        <Text bold color={colors.text}>Plugins</Text>
        <Text color={colors.muted}>Extend Pilot with official Medal Social integrations</Text>
      </Box>
      <TabBar tabs={TABS} activeTab={activeTab} />
      <SplitPanel
        sidebarWidth={28}
        sidebar={
          <Box flexDirection="column">
            <Text color={colors.primary} bold>
              {' '}@MEDALSOCIAL
            </Text>
            {filtered.map((p, i) => (
              <Box key={p.name} flexDirection="column" paddingX={1} paddingY={0}>
                <Text bold color={i === selected ? colors.text : colors.muted}>
                  {p.name}
                </Text>
                <Text color={colors.muted} dimColor>
                  {p.installed ? '● installed' : '○ available'}
                </Text>
              </Box>
            ))}
          </Box>
        }
        detail={
          current ? (
            <Box flexDirection="column" gap={1}>
              <Text bold color={colors.text}>
                {current.name}
              </Text>
              <Text color={colors.muted}>
                @medalsocial/{current.name} · {current.description}
              </Text>
              <Box flexDirection="column">
                <Text color={colors.primary} bold>PROVIDES</Text>
                {current.provides.map((p) => (
                  <Text key={p} color={colors.success}>✓ {p}</Text>
                ))}
              </Box>
              {current.installed && (
                <Box gap={2}>
                  <Text color={colors.warning}>[Disable]</Text>
                  <Text color={colors.error}>[Remove]</Text>
                </Box>
              )}
            </Box>
          ) : null
        }
      />
      <StatusBar
        items={[
          {
            label: `● ${PLUGINS.filter((p) => p.installed).length} installed`,
            color: colors.success,
          },
          { label: `${PLUGINS.filter((p) => !p.installed).length} available` },
          { label: 'pilot plugins' },
        ]}
      />
    </Box>
  );
}
