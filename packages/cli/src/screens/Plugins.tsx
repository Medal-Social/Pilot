// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Text, useInput } from 'ink';
import { useEffect, useMemo, useState } from 'react';
import { colors } from '../colors.js';
import { SplitPanel } from '../components/SplitPanel.js';
import { StatusBar } from '../components/StatusBar.js';
import { TabBar } from '../components/TabBar.js';
import { useListNav } from '../hooks/useListNav.js';
import type { LoadedPlugin } from '../plugins/types.js';
import { loadSettings, saveSettings } from '../settings.js';
import type { Tab } from '../types.js';

const TABS: Tab[] = [
  { id: 'all', label: 'All' },
  { id: 'enabled', label: 'Enabled' },
  { id: 'disabled', label: 'Disabled' },
];

function filterByTab(plugins: LoadedPlugin[], tab: string) {
  if (tab === 'enabled') return plugins.filter((p) => p.enabled);
  if (tab === 'disabled') return plugins.filter((p) => !p.enabled);
  return plugins;
}

interface PluginsProps {
  plugins: LoadedPlugin[];
}

export function Plugins({ plugins: initialPlugins }: PluginsProps) {
  const [plugins, setPlugins] = useState(initialPlugins);
  const [activeTab, setActiveTab] = useState('all');

  const displayPlugins = useMemo(() => filterByTab(plugins, activeTab), [plugins, activeTab]);

  const nav = useListNav({
    listLength: displayPlugins.length,
    tabs: TABS,
  });

  // Sync local activeTab with the hook's tab state so filtered list length stays correct
  useEffect(() => {
    setActiveTab(nav.activeTab);
  }, [nav.activeTab]);

  const current = displayPlugins[nav.selected];

  useInput((input) => {
    if (!current) return;
    if (input === 'd' && current.enabled) {
      const updated = plugins.map((p) => (p.id === current.id ? { ...p, enabled: false } : p));
      setPlugins(updated);
      persistPluginState(updated);
    } else if (input === 'e' && !current.enabled) {
      const updated = plugins.map((p) => (p.id === current.id ? { ...p, enabled: true } : p));
      setPlugins(updated);
      persistPluginState(updated);
    }
  });

  const enabledCount = plugins.filter((p) => p.enabled).length;
  const disabledCount = plugins.filter((p) => !p.enabled).length;

  return (
    <Box flexDirection="column" height="100%">
      <Box paddingX={1} paddingY={0} flexDirection="column">
        <Text bold color={colors.text}>
          Plugins
        </Text>
        <Text color={colors.muted}>Extend Pilot with official Medal Social integrations</Text>
      </Box>
      <TabBar tabs={TABS} activeTab={nav.activeTab} />
      <SplitPanel
        sidebarWidth={28}
        sidebar={
          <Box flexDirection="column">
            {displayPlugins.length === 0 ? (
              <Box paddingX={1}>
                <Text color={colors.muted}>No plugins in this view</Text>
              </Box>
            ) : (
              displayPlugins.map((p, i) => (
                <Box key={p.id} flexDirection="column" paddingX={1} paddingY={0}>
                  <Text bold color={i === nav.selected ? colors.text : colors.muted}>
                    {i === nav.selected ? '▸ ' : '  '}
                    {p.manifest.name}
                  </Text>
                  <Text color={p.enabled ? colors.success : colors.muted} dimColor>
                    {'  '}
                    {p.enabled ? '● enabled' : '○ disabled'}
                  </Text>
                </Box>
              ))
            )}
          </Box>
        }
        detail={
          current ? (
            <Box flexDirection="column" gap={1}>
              <Text bold color={colors.text}>
                {current.manifest.name}
              </Text>
              <Text color={colors.muted}>
                {current.id} · {current.manifest.description}
              </Text>
              <Box flexDirection="column">
                <Text color={colors.primary} bold>
                  PROVIDES
                </Text>
                {(current.manifest.provides.commands ?? []).map((cmd) => (
                  <Text key={cmd} color={colors.success}>
                    ✓ {cmd}
                  </Text>
                ))}
                {(current.manifest.provides.mcpServers ?? []).map((srv) => (
                  <Text key={srv} color={colors.success}>
                    ✓ {srv} (MCP)
                  </Text>
                ))}
              </Box>
              <Box gap={2}>
                {current.enabled ? (
                  <Text color={colors.warning}>[d] Disable</Text>
                ) : (
                  <Text color={colors.success}>[e] Enable</Text>
                )}
              </Box>
            </Box>
          ) : (
            <Box paddingX={1}>
              <Text color={colors.muted}>Select a plugin to view details</Text>
            </Box>
          )
        }
      />
      <StatusBar
        items={[
          { label: `● ${enabledCount} enabled`, color: colors.success },
          { label: `${disabledCount} disabled` },
          { label: '↑↓ navigate · 1-3 tabs · d/e toggle' },
        ]}
      />
    </Box>
  );
}

function persistPluginState(plugins: LoadedPlugin[]): void {
  const settings = loadSettings();
  for (const p of plugins) {
    settings.plugins[p.id] = { enabled: p.enabled };
  }
  saveSettings(settings);
}
