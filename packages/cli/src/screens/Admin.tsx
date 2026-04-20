// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Text, useApp, useInput } from 'ink';
import { useCallback, useEffect, useState } from 'react';
import type { AdminAPI, DashboardData } from '../admin/api.js';
import type { ContentStats, WorkspaceDetail } from '../admin/types.js';
import { colors } from '../colors.js';
import { StatusBar } from '../components/StatusBar.js';
import { TabBar } from '../components/TabBar.js';
import type { Tab } from '../types.js';
import { AnalyticsPanel } from './admin/AnalyticsPanel.js';
import { ContentPanel } from './admin/ContentPanel.js';
import { HealthStrip } from './admin/HealthStrip.js';
import { OverviewPanel } from './admin/OverviewPanel.js';
import { SettingsPanel } from './admin/SettingsPanel.js';
import { SitePanel } from './admin/SitePanel.js';

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'site', label: 'Site' },
  { id: 'content', label: 'Content' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings' },
];

const POLL_INTERVAL = 30_000;

interface AdminProps {
  api: AdminAPI;
  workspaceId?: string;
}

export function Admin({ api, workspaceId }: AdminProps) {
  const { exit } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [contentStats, setContentStats] = useState<ContentStats | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [dashData, workspaces] = await Promise.all([
        api.fetchDashboard(),
        api.fetchWorkspaces(),
      ]);
      setDashboard(dashData);

      const wsId = workspaceId ?? workspaces[0]?.id;
      if (wsId) {
        const [detail, content] = await Promise.all([
          api.fetchWorkspaceDetail(wsId),
          api.fetchContentStats(wsId),
        ]);
        setWorkspace(detail);
        setContentStats(content);
      }
      setFetchError(null);
    } catch (err) {
      // Surface the error in-UI rather than letting it become an unhandled
      // promise rejection (which would crash the TUI). Stale data stays
      // visible so the dashboard remains useful while the user resolves it.
      /* v8 ignore next */
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setFetchError(msg);
    }
  }, [api, workspaceId]);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(
      /* v8 ignore next */ () => {
        void fetchData();
      },
      POLL_INTERVAL
    );
    return () => clearInterval(interval);
  }, [fetchData]);

  useInput((input, key) => {
    if (input === 'q') {
      exit();
      return;
    }
    if (input === 'r') {
      fetchData();
      return;
    }
    const num = Number.parseInt(input, 10);
    if (num >= 1 && num <= TABS.length) {
      setActiveTab(TABS[num - 1].id);
    }
    if (key.tab) {
      const currentIndex = TABS.findIndex((t) => t.id === activeTab);
      const nextIndex = key.shift
        ? (currentIndex - 1 + TABS.length) % TABS.length
        : (currentIndex + 1) % TABS.length;
      setActiveTab(TABS[nextIndex].id);
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      <Box paddingX={1} justifyContent="space-between">
        <Text bold color={colors.primary}>
          ✈ PILOT ADMIN
        </Text>
        <Text color={colors.muted}>{workspace?.name ?? 'Loading...'}</Text>
      </Box>

      <HealthStrip services={dashboard?.services ?? []} stats={dashboard?.stats} />

      {/* v8 ignore next 6 */}
      {fetchError && (
        <Box paddingX={1}>
          <Text color={colors.error}>! refresh failed: {fetchError} </Text>
          <Text color={colors.muted}>(press r to retry)</Text>
        </Box>
      )}

      <TabBar tabs={TABS} activeTab={activeTab} />

      <Box flexGrow={1} flexDirection="column">
        {activeTab === 'overview' && <OverviewPanel workspace={workspace ?? undefined} />}
        {activeTab === 'site' && <SitePanel workspace={workspace ?? undefined} />}
        {activeTab === 'content' && <ContentPanel stats={contentStats ?? undefined} />}
        {activeTab === 'analytics' && <AnalyticsPanel workspace={workspace ?? undefined} />}
        {activeTab === 'settings' && <SettingsPanel workspace={workspace ?? undefined} />}
      </Box>

      <StatusBar
        items={[
          { label: '↑↓ navigate', color: colors.muted },
          { label: '1-5 tabs' },
          { label: 'r refresh' },
          { label: '/ search' },
          { label: 'q quit' },
        ]}
      />
    </Box>
  );
}
