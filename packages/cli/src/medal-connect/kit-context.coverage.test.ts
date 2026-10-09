import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as kitApps from '@medalsocial/kit/commands/apps';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exec } from '../shell/exec.js';
import { getKitConfigPath, resolveKitContext } from './kit-context.js';

const { candidates } = vi.hoisted(() => ({ candidates: vi.fn<() => string[]>() }));
vi.mock('@medalsocial/kit', () => ({ configCandidates: candidates }));

let dir: string;
let configPath: string;
const success = { code: 0, stdout: '', stderr: '' };

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'pilot-kit-coverage-'));
  configPath = join(dir, 'kit.config.json');
  writeConfig();
  candidates.mockReturnValue([configPath]);
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
});

function writeConfig(extra: Record<string, unknown> = {}) {
  writeFileSync(
    configPath,
    JSON.stringify({ machines: { m1: { type: 'darwin', user: 'u' } }, ...extra })
  );
}

function context(exec?: Exec) {
  return resolveKitContext({ kitConfigPath: configPath, machineId: 'm1', exec });
}

function apps(path: string, casks: string[] = []) {
  writeFileSync(path, JSON.stringify({ casks, brews: [] }));
}

describe('kit context configuration and live app files', () => {
  it('uses the first existing config candidate and the shared resolver by default', async () => {
    candidates.mockReturnValue([join(dir, 'missing.json'), configPath]);
    expect(await getKitConfigPath()).toBe(configPath);
    expect((await resolveKitContext({ machineId: 'm1' })).kitRepoDir).toBe(dir);
    candidates.mockReturnValue([join(dir, 'missing.json')]);
    expect(await getKitConfigPath()).toBe(join(dir, 'missing.json'));
    candidates.mockReturnValue([]);
    expect(await getKitConfigPath()).toBe(
      join(process.env.HOME ?? '~', 'Documents/Code/kit/kit.config.json')
    );
  });

  it.each(['~', '~/kit', 'relative-kit', '/tmp/explicit-kit'])(
    'resolves repoDir %s relative to its documented base',
    async (repoDir) => {
      writeConfig({ repoDir });
      const expected =
        repoDir === '~'
          ? process.env.HOME
          : repoDir.startsWith('~/')
            ? join(process.env.HOME ?? '', 'kit')
            : repoDir.startsWith('/')
              ? repoDir
              : join(dir, repoDir);
      expect((await context()).kitRepoDir).toBe(expected);
    }
  );

  it('rejects a config without machines', async () => {
    writeFileSync(configPath, '{}');
    await expect(context()).rejects.toMatchObject({ code: 'CONNECT_KIT_MACHINE_NOT_IN_CONFIG' });
  });

  it('follows migration from the legacy app file into nested machine files without recreating the context', async () => {
    mkdirSync(join(dir, 'apps'));
    const legacy = join(dir, 'apps/apps.json');
    apps(legacy);
    const ctx = await context();
    expect(ctx.resolveAppsFile()).toBe(legacy);
    await ctx.addCask('zed');
    await ctx.addCask('zed'); // retry after a failed push must stay idempotent
    expect(JSON.parse(readFileSync(legacy, 'utf8')).casks).toEqual(['zed']);
    mkdirSync(join(dir, 'machines/empty'), { recursive: true });
    writeFileSync(join(dir, 'machines/a-unrelated.txt'), 'ignored');
    symlinkSync(join(dir, 'missing-target'), join(dir, 'machines/broken-link'));
    mkdirSync(join(dir, 'machines/nested'));
    const migrated = join(dir, 'machines/nested/m1.apps.json');
    apps(migrated, ['zed']);
    expect(ctx.resolveAppsFile()).toBe(migrated);
    await ctx.removeCask('zed');
    await ctx.removeCask('zed');
    expect(JSON.parse(readFileSync(migrated, 'utf8')).casks).toEqual([]);
    expect(JSON.parse(readFileSync(legacy, 'utf8')).casks).toEqual(['zed']);
  });

  it('keeps real app-file errors visible instead of treating them as duplicate retries', async () => {
    mkdirSync(join(dir, 'machines'));
    writeFileSync(join(dir, 'machines/m1.apps.json'), '{ invalid');
    const ctx = await context();
    await expect(ctx.addCask('zed')).rejects.toThrow();
    await expect(ctx.removeCask('zed')).rejects.toThrow();
  });

  it.each([null, 'storage unavailable'])(
    'propagates a non-Error package rejection (%s)',
    async (error) => {
      vi.spyOn(kitApps, 'addApp').mockRejectedValueOnce(error);
      await expect((await context()).addCask('zed')).rejects.toBe(error);
    }
  );
});

describe('kit rebuild outcomes', () => {
  it.each(['darwin', 'nixos'])(
    'uses the %s rebuild command and reports its result',
    async (type) => {
      writeConfig({ machines: { m1: { type, user: 'u' } } });
      const run = vi
        .fn<Exec['run']>()
        .mockResolvedValueOnce(success)
        .mockResolvedValueOnce({ code: 1, stdout: '', stderr: 'x'.repeat(600) });
      const ctx = await context({ run });
      expect(await ctx.runRebuild()).toMatchObject({ ok: true, error: undefined });
      expect(run).toHaveBeenCalledWith(
        'sudo',
        [type === 'darwin' ? 'darwin-rebuild' : 'nixos-rebuild', 'switch', '--flake', '.#m1'],
        { cwd: dir }
      );
      expect(await ctx.runRebuild()).toMatchObject({ ok: false, error: 'x'.repeat(500) });
    }
  );

  it.each([false, true])(
    'reports missing user-layer Nix (home-manager installed: %s)',
    async (installed) => {
      writeConfig({ machines: { m1: { type: 'linux', user: 'u' } } });
      const run = vi.fn<Exec['run']>().mockImplementation(async (cmd, args) => {
        if (cmd === 'which' && args[0] === 'system-manager')
          return { ...success, stdout: '/bin/system-manager' };
        if (cmd === 'sudo') return success;
        if (cmd === 'which' && args[0] === 'home-manager' && installed)
          return { ...success, stdout: '/bin/home-manager' };
        if (cmd === 'home-manager') return { code: 1, stdout: '', stderr: 'user layer failed' };
        return { code: 1, stdout: '', stderr: '' };
      });
      const result = await (await context({ run })).runRebuild();
      expect(result.ok).toBe(false);
      expect(result.error).toContain(
        installed ? 'user layer failed' : 'Could not locate `nix` to bootstrap home-manager'
      );
    }
  );

  it('bootstraps both layers using the second canonical Nix path when PATH is empty', async () => {
    writeConfig({ machines: { m1: { type: 'linux', user: 'u' } } });
    const nix = '/run/current-system/sw/bin/nix';
    const run = vi.fn<Exec['run']>().mockImplementation(async (cmd, args) => {
      if (cmd === 'which') return { ...success, stdout: '  ' };
      if (cmd === 'test') return { ...success, code: args[1] === nix ? 0 : 1 };
      return success;
    });
    expect(await (await context({ run })).runRebuild()).toMatchObject({ ok: true });
    expect(run).toHaveBeenCalledWith(
      'sudo',
      [nix, 'run', 'github:numtide/system-manager', '--', 'switch', '--flake', '.#m1'],
      { cwd: dir }
    );
    expect(run).toHaveBeenCalledWith(
      nix,
      ['run', 'github:nix-community/home-manager', '--', 'switch', '--flake', '.#m1'],
      { cwd: dir }
    );
  });
});

describe('kit git failure and retry contracts', () => {
  it('honors the no-git strategy without starting any subprocess', async () => {
    writeConfig({ gitStrategy: 'none' });
    const run = vi.fn<Exec['run']>();
    await (await context({ run })).commitAndPush('no-op');
    expect(run).not.toHaveBeenCalled();
  });

  it.each(['add', 'commit', 'push'] as const)(
    'surfaces %s failure and never continues to later git operations',
    async (operation) => {
      const run = vi
        .fn<Exec['run']>()
        .mockImplementation(async (_cmd, args) =>
          args.includes(operation)
            ? { code: 7, stdout: '', stderr: ' permission denied ' }
            : success
        );
      await expect(
        (await context({ run })).commitAndPush('change', ['config.nix'])
      ).rejects.toThrow(`git ${operation} failed: permission denied`);
      expect(run).toHaveBeenCalledTimes(operation === 'add' ? 1 : operation === 'commit' ? 2 : 3);
    }
  );

  it.each(['add', 'commit', 'push'] as const)(
    'reports the %s exit status when stderr is empty',
    async (operation) => {
      const run = vi
        .fn<Exec['run']>()
        .mockImplementation(async (_cmd, args) =>
          args.includes(operation) ? { code: 7, stdout: '', stderr: '' } : success
        );
      await expect(
        (await context({ run })).commitAndPush('change', ['config.nix'])
      ).rejects.toThrow(`git ${operation} failed: exit 7`);
    }
  );

  it.each(['stdout', 'stderr'] as const)(
    'pushes pending commits after a no-op commit reported on %s',
    async (stream) => {
      const run = vi
        .fn<Exec['run']>()
        .mockImplementation(async (_cmd, args) =>
          args[0] === 'commit'
            ? { code: 1, stdout: '', stderr: '', [stream]: 'Nothing to commit' }
            : success
        );
      await (await context({ run })).commitAndPush('retry', ['config.nix']);
      expect(run).toHaveBeenLastCalledWith('git', ['push'], { cwd: dir });
    }
  );
});
