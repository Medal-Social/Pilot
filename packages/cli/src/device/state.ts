// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PILOT_DIR = join(homedir(), '.pilot');
const STATE_FILE = join(PILOT_DIR, 'templates.json');

export interface InstalledDependency {
  label: string;
  installed: boolean;
}

export interface InstalledTemplate {
  name: string;
  installedAt: string;
  lastChecked: string;
  dependencies: Record<string, boolean>;
  crewSpecialist?: string;
}

export interface TemplateState {
  templates: Record<string, InstalledTemplate>;
}

export function loadTemplateState(): TemplateState {
  if (!existsSync(STATE_FILE)) {
    return { templates: {} };
  }
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return { templates: {} };
  }
}

export function saveTemplateState(state: TemplateState): void {
  mkdirSync(PILOT_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function removeTemplateFromState(templateName: string): void {
  const state = loadTemplateState();
  delete state.templates[templateName];
  saveTemplateState(state);
}

export function getInstalledTemplateNames(): string[] {
  const state = loadTemplateState();
  return Object.keys(state.templates);
}
