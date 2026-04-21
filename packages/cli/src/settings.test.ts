// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSettings, markOnboarded, saveSettings } from './settings.js';

vi.mock('node:fs');
vi.mock('node:os', () => ({ homedir: () => '/mock/home' }));

describe('settings', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('loadSettings', () => {
    it('returns default settings when file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const settings = loadSettings();

      expect(settings.onboarded).toBe(false);
      expect(settings.plugins).toEqual({});
    });

    it('merges stored settings with defaults', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ onboarded: true, plugins: { kit: { enabled: true } } })
      );

      const settings = loadSettings();

      expect(settings.onboarded).toBe(true);
      expect(settings.plugins).toEqual({ kit: { enabled: true } });
    });

    it('returns defaults when JSON parse fails', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('not-valid-json');

      const settings = loadSettings();

      expect(settings.onboarded).toBe(false);
      expect(settings.plugins).toEqual({});
    });
  });

  describe('saveSettings', () => {
    it('creates the pilot dir and writes settings JSON', () => {
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      saveSettings({ onboarded: true, plugins: {} });

      expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/home/.pilot', { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/home/.pilot/settings.json',
        JSON.stringify({ onboarded: true, plugins: {} }, null, 2)
      );
    });
  });

  describe('markOnboarded', () => {
    it('sets onboarded to true and persists lastRun timestamp', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-11T00:00:00.000Z'));
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      markOnboarded();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/home/.pilot/settings.json',
        expect.stringContaining('"onboarded": true')
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/home/.pilot/settings.json',
        expect.stringContaining('"lastRun": "2026-04-11T00:00:00.000Z"')
      );
      vi.useRealTimers();
    });
  });

  describe('new UP fields', () => {
    it('loadSettings returns empty mcpServers and crew when missing from file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const settings = loadSettings();
      expect(settings.mcpServers).toEqual({});
      expect(settings.crew.specialists).toEqual({});
    });

    it('saveSettings + loadSettings round-trips mcpServers', () => {
      let savedData = '';
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockImplementation((_path, data) => {
        savedData = String(data);
      });
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => savedData);

      const settings = loadSettings();
      settings.mcpServers['pencil'] = { command: 'pencil mcp' };
      saveSettings(settings);
      const reloaded = loadSettings();
      expect(reloaded.mcpServers['pencil']).toEqual({ command: 'pencil mcp' });
    });
  });
});
