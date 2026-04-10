import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const PILOT_DIR = join(homedir(), '.pilot');
const SETTINGS_FILE = join(PILOT_DIR, 'settings.json');

export interface PilotSettings {
  onboarded: boolean;
  lastRun?: string;
  plugins: Record<string, { enabled: boolean }>;
}

const DEFAULT_SETTINGS: PilotSettings = {
  onboarded: false,
  plugins: {},
};

export function loadSettings(): PilotSettings {
  if (!existsSync(SETTINGS_FILE)) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'));
    return { ...DEFAULT_SETTINGS, ...raw };
  } catch {
    return { ...DEFAULT_SETTINGS };
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
