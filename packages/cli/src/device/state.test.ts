import * as fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getInstalledTemplateNames,
  loadTemplateState,
  removeTemplateFromState,
  saveTemplateState,
} from './state.js';

vi.mock('node:fs');
vi.mock('node:os', () => ({ homedir: () => '/mock/home' }));

describe('device/state', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('loadTemplateState', () => {
    it('returns empty state when file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const state = loadTemplateState();

      expect(state.templates).toEqual({});
    });

    it('returns parsed state from file', () => {
      const stored = {
        templates: {
          kit: {
            name: 'kit',
            installedAt: '2026-01-01',
            lastChecked: '2026-01-02',
            dependencies: {},
          },
        },
      };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(stored));

      const state = loadTemplateState();

      expect(state.templates.kit.name).toBe('kit');
    });

    it('returns empty state when JSON is invalid', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('corrupted');

      const state = loadTemplateState();

      expect(state.templates).toEqual({});
    });
  });

  describe('saveTemplateState', () => {
    it('creates pilot dir and writes state', () => {
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      saveTemplateState({ templates: {} });

      expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/home/.pilot', { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/home/.pilot/templates.json',
        JSON.stringify({ templates: {} }, null, 2)
      );
    });
  });

  describe('removeTemplateFromState', () => {
    it('removes the named template and saves', () => {
      const stored = {
        templates: {
          kit: {
            name: 'kit',
            installedAt: '2026-01-01',
            lastChecked: '2026-01-02',
            dependencies: {},
          },
          pencil: {
            name: 'pencil',
            installedAt: '2026-01-01',
            lastChecked: '2026-01-02',
            dependencies: {},
          },
        },
      };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(stored));
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      const writeSpy = vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      removeTemplateFromState('kit');

      const written = JSON.parse(writeSpy.mock.calls[0][1] as string);
      expect(written.templates).not.toHaveProperty('kit');
      expect(written.templates).toHaveProperty('pencil');
    });
  });

  describe('getInstalledTemplateNames', () => {
    it('returns list of installed template names', () => {
      const stored = {
        templates: {
          kit: {
            name: 'kit',
            installedAt: '2026-01-01',
            lastChecked: '2026-01-02',
            dependencies: {},
          },
          pencil: {
            name: 'pencil',
            installedAt: '2026-01-01',
            lastChecked: '2026-01-02',
            dependencies: {},
          },
        },
      };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(stored));

      const names = getInstalledTemplateNames();

      expect(names).toContain('kit');
      expect(names).toContain('pencil');
      expect(names).toHaveLength(2);
    });

    it('returns empty array when no templates installed', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const names = getInstalledTemplateNames();

      expect(names).toEqual([]);
    });
  });
});
