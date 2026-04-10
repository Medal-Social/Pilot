import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const PILOT_DIR = join(homedir(), '.pilot');
const STATE_FILE = join(PILOT_DIR, 'state.json');

interface PilotState {
  onboarded: boolean;
  lastRun?: string;
}

export function loadState(): PilotState {
  if (!existsSync(STATE_FILE)) {
    return { onboarded: false };
  }
  return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
}

export function saveState(state: PilotState): void {
  mkdirSync(PILOT_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function markOnboarded(): void {
  const state = loadState();
  state.onboarded = true;
  state.lastRun = new Date().toISOString();
  saveState(state);
}
