// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type StepStatus = 'done' | 'active' | 'waiting' | 'error';

export interface StepItem {
  label: string;
  detail?: string;
  status: StepStatus;
}

export interface CrewMember {
  role: string;
  description: string;
  skills: string[];
  color: string;
}

export interface PluginManifest {
  name: string;
  namespace: string;
  description: string;
  provides: {
    commands?: string[];
    mcpServers?: string[];
  };
  permissions?: {
    network?: string[];
  };
  roleBindings?: Record<string, string>;
}

export type TabId = string;

export interface Tab {
  id: TabId;
  label: string;
}
