// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PILOT_DIR = join(homedir(), '.pilot');
const SETTINGS_FILE = join(PILOT_DIR, 'settings.json');

export interface SpecialistEntry {
  displayName: string;
  skills: string[];
}

export interface PilotSettings {
  onboarded: boolean;
  lastRun?: string;
  plugins: Record<string, { enabled: boolean }>;
  mcpServers: Record<string, { command: string }>;
  crew: { specialists: Record<string, SpecialistEntry> };
}

const DEFAULT_SETTINGS: PilotSettings = {
  onboarded: false,
  plugins: {},
  mcpServers: {},
  crew: { specialists: {} },
};

export function loadSettings(): PilotSettings {
  if (!existsSync(SETTINGS_FILE)) {
    return structuredClone(DEFAULT_SETTINGS);
  }
  try {
    const raw = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'));
    return {
      ...DEFAULT_SETTINGS,
      ...raw,
      mcpServers: raw.mcpServers ?? {},
      crew: { specialists: raw.crew?.specialists ?? {} },
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings: PilotSettings): void {
  mkdirSync(PILOT_DIR, { recursive: true });
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

export function markOnboarded(): void {
  const settings = loadSettings();
  settings.onboarded = true;
  settings.lastRun = new Date().toISOString();
  saveSettings(settings);
}
