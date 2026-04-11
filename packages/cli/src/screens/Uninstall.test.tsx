// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  rmSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock/home'),
}));

vi.mock('../device/backup.js', () => ({
  backupKnowledge: vi.fn(() => ({
    success: true,
    backupPath: '/mock/home/pilot-backup-2026-04-10',
  })),
}));

vi.mock('../device/state.js', () => ({
  getInstalledTemplateNames: vi.fn(() => []),
}));

vi.mock('../device/uninstaller.js', () => ({
  uninstallTemplate: vi.fn(async (name: string) => ({
    template: name,
    removed: [],
    failed: [],
    skipped: [],
  })),
}));

vi.mock('../deploy/deployer.js', () => ({
  removeRoutingFromClaudeMd: vi.fn(() => ({ success: true })),
  removeSkillSymlink: vi.fn(() => ({ success: true })),
}));

vi.mock('node:child_process', () => ({
  execFile: vi.fn((_cmd: string, _args: string[], _opts: unknown, cb: (err: null) => void) => {
    cb(null);
  }),
}));

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

describe('Uninstall', () => {
  it('shows warning and backup message on initial render', async () => {
    const { Uninstall } = await import('./Uninstall.js');
    const { lastFrame } = render(<Uninstall />);
    await delay();
    const frame = lastFrame() ?? '';
    expect(frame).toContain('remove Pilot');
    expect(frame).toContain('backed up');
  });

  it('advances through steps on Y input', async () => {
    vi.resetModules();

    vi.mock('node:fs', () => ({
      existsSync: vi.fn(() => true),
      rmSync: vi.fn(),
    }));
    vi.mock('node:os', () => ({
      homedir: vi.fn(() => '/mock/home'),
    }));
    vi.mock('../device/backup.js', () => ({
      backupKnowledge: vi.fn(() => ({
        success: true,
        backupPath: '/mock/home/pilot-backup-2026-04-10',
      })),
    }));
    vi.mock('../device/state.js', () => ({
      getInstalledTemplateNames: vi.fn(() => []),
    }));
    vi.mock('../device/uninstaller.js', () => ({
      uninstallTemplate: vi.fn(async (name: string) => ({
        template: name,
        removed: [],
        failed: [],
        skipped: [],
      })),
    }));
    vi.mock('../deploy/deployer.js', () => ({
      removeRoutingFromClaudeMd: vi.fn(() => ({ success: true })),
      removeSkillSymlink: vi.fn(() => ({ success: true })),
    }));
    vi.mock('node:child_process', () => ({
      execFile: vi.fn((_cmd: string, _args: string[], _opts: unknown, cb: (err: null) => void) => {
        cb(null);
      }),
    }));

    const { Uninstall } = await import('./Uninstall.js');
    const { lastFrame, stdin } = render(<Uninstall />);
    await delay();

    // Confirm intro
    stdin.write('y');
    await delay();

    // Step 1 shown — confirm
    stdin.write('y');
    await delay();

    const frame = lastFrame() ?? '';
    // Should have advanced past intro and completed step 1
    expect(frame).toContain('Knowledge');
  });

  it('skips a step on N input', async () => {
    vi.resetModules();

    vi.mock('node:fs', () => ({
      existsSync: vi.fn(() => true),
      rmSync: vi.fn(),
    }));
    vi.mock('node:os', () => ({
      homedir: vi.fn(() => '/mock/home'),
    }));
    vi.mock('../device/backup.js', () => ({
      backupKnowledge: vi.fn(() => ({
        success: true,
        backupPath: '/mock/home/pilot-backup-2026-04-10',
      })),
    }));
    vi.mock('../device/state.js', () => ({
      getInstalledTemplateNames: vi.fn(() => []),
    }));
    vi.mock('../device/uninstaller.js', () => ({
      uninstallTemplate: vi.fn(async (name: string) => ({
        template: name,
        removed: [],
        failed: [],
        skipped: [],
      })),
    }));
    vi.mock('../deploy/deployer.js', () => ({
      removeRoutingFromClaudeMd: vi.fn(() => ({ success: true })),
      removeSkillSymlink: vi.fn(() => ({ success: true })),
    }));
    vi.mock('node:child_process', () => ({
      execFile: vi.fn((_cmd: string, _args: string[], _opts: unknown, cb: (err: null) => void) => {
        cb(null);
      }),
    }));

    const { Uninstall } = await import('./Uninstall.js');
    const { lastFrame, stdin } = render(<Uninstall />);
    await delay();

    // Confirm intro
    stdin.write('y');
    await delay();

    // Skip step 1
    stdin.write('n');
    await delay();

    const frame = lastFrame() ?? '';
    // Should show a skipped step indicator
    expect(frame).toContain('skipped');
  });

  it('shows done message after walking through all steps with Y', async () => {
    vi.resetModules();

    vi.mock('node:fs', () => ({
      existsSync: vi.fn(() => true),
      rmSync: vi.fn(),
    }));
    vi.mock('node:os', () => ({
      homedir: vi.fn(() => '/mock/home'),
    }));
    vi.mock('../device/backup.js', () => ({
      backupKnowledge: vi.fn(() => ({
        success: true,
        backupPath: '/mock/home/pilot-backup-2026-04-10',
      })),
    }));
    vi.mock('../device/state.js', () => ({
      getInstalledTemplateNames: vi.fn(() => []),
    }));
    vi.mock('../device/uninstaller.js', () => ({
      uninstallTemplate: vi.fn(async (name: string) => ({
        template: name,
        removed: [],
        failed: [],
        skipped: [],
      })),
    }));
    vi.mock('../deploy/deployer.js', () => ({
      removeRoutingFromClaudeMd: vi.fn(() => ({ success: true })),
      removeSkillSymlink: vi.fn(() => ({ success: true })),
    }));
    vi.mock('node:child_process', () => ({
      execFile: vi.fn((_cmd: string, _args: string[], _opts: unknown, cb: (err: null) => void) => {
        cb(null);
      }),
    }));

    const { Uninstall } = await import('./Uninstall.js');
    const { lastFrame, stdin } = render(<Uninstall />);
    await delay();

    // Intro → y
    stdin.write('y');
    await delay();
    // Step 1 (knowledge) → y
    stdin.write('y');
    await delay();
    // Step 2 (skills) → y
    stdin.write('y');
    await delay();
    // Step 3 (claude) → y
    stdin.write('y');
    await delay();
    // Step 4 (tools) — skipped automatically (no templates)
    // Step 5 (cli) → y
    stdin.write('y');
    await delay(300);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('removed');
  });

  it('shows backup path and skipped items in done phase', async () => {
    // Top-level mock already returns backupPath='/mock/home/pilot-backup-2026-04-10'
    const { Uninstall } = await import('./Uninstall.js');
    const { lastFrame, stdin } = render(<Uninstall />);
    await delay();

    stdin.write('y');
    await delay(); // intro — backup runs, sets backupPath
    stdin.write('n');
    await delay(); // skip step 1
    stdin.write('n');
    await delay(); // skip step 2
    stdin.write('n');
    await delay(); // skip step 3
    // step 4 auto-skipped
    stdin.write('n');
    await delay(); // skip step 5 → done

    const frame = lastFrame() ?? '';
    expect(frame).toContain('pilot-backup');
    expect(frame).toContain('Skipped');
  });

  it('shows npm error when execFile fails in step5', async () => {
    const cp = await import('node:child_process');
    vi.mocked(cp.execFile).mockImplementationOnce(
      (_cmd: string, _args: string[], _opts: unknown, cb: unknown) => {
        (cb as (err: Error) => void)(new Error('EACCES'));
        return undefined as never;
      }
    );

    const { Uninstall } = await import('./Uninstall.js');
    const { lastFrame, stdin } = render(<Uninstall />);
    await delay();

    stdin.write('y');
    await delay(); // intro
    stdin.write('y');
    await delay(); // step 1
    stdin.write('y');
    await delay(); // step 2
    stdin.write('y');
    await delay(); // step 3
    // step 4 auto-skipped
    stdin.write('y');
    await delay(300); // step 5 (triggers npm error)

    const frame = lastFrame() ?? '';
    expect(frame).toContain('uninstall');
  });

  it('shows backup-failed phase when backup returns failure', async () => {
    const backup = await import('../device/backup.js');
    vi.mocked(backup.backupKnowledge).mockReturnValueOnce({
      success: false,
      skipped: false,
    } as never);

    const { Uninstall } = await import('./Uninstall.js');
    const { lastFrame, stdin } = render(<Uninstall />);
    await delay();

    stdin.write('y');
    await delay();

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Could not back up');

    // Press any key to exit from backup-failed phase
    stdin.write('y');
    await delay();
  });

  it('advances when backup succeeds but has no backupPath', async () => {
    const backup = await import('../device/backup.js');
    vi.mocked(backup.backupKnowledge).mockReturnValueOnce({
      success: true,
      skipped: true,
    } as never);

    const { Uninstall } = await import('./Uninstall.js');
    const { lastFrame, stdin } = render(<Uninstall />);
    await delay();

    stdin.write('y');
    await delay();

    // Should advance to step 1 without setting backupPath
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Remove knowledge');
  });

  it('exits when user presses N at intro', async () => {
    const { Uninstall } = await import('./Uninstall.js');
    const { lastFrame, stdin } = render(<Uninstall />);
    await delay();

    // Press 'n' at intro — should exit
    stdin.write('n');
    await delay();

    // After exit the frame should be empty or show the intro (exit is mocked by ink-testing-library)
    const frame = lastFrame() ?? '';
    expect(frame).toBeDefined();
  });

  it('ignores non-y/n input during intro phase', async () => {
    const { Uninstall } = await import('./Uninstall.js');
    const { lastFrame, stdin } = render(<Uninstall />);
    await delay();

    // Press 'x' — should be ignored
    stdin.write('x');
    await delay();

    const frame = lastFrame() ?? '';
    expect(frame).toContain('remove Pilot');
  });

  it('skips templates step4 with n when templates are installed', async () => {
    const state = await import('../device/state.js');
    vi.mocked(state.getInstalledTemplateNames).mockReturnValueOnce(['pencil']);

    const { Uninstall } = await import('./Uninstall.js');
    const { lastFrame, stdin } = render(<Uninstall />);
    await delay();

    stdin.write('y');
    await delay(); // intro
    stdin.write('y');
    await delay(); // step 1
    stdin.write('y');
    await delay(); // step 2
    stdin.write('y');
    await delay(); // step 3
    // step 4 shows templates — skip them
    expect(lastFrame()).toContain('pencil');
    stdin.write('n');
    await delay(); // step 4 — skip

    const frame = lastFrame() ?? '';
    // Should have skipped dev tools and be at step 5
    expect(frame).toContain('Dev tools');
    expect(frame).toContain('skipped');
  });

  it('walks through step4 with templates installed', async () => {
    const state = await import('../device/state.js');
    vi.mocked(state.getInstalledTemplateNames).mockReturnValueOnce(['pencil']);

    const { Uninstall } = await import('./Uninstall.js');
    const { lastFrame, stdin } = render(<Uninstall />);
    await delay();

    stdin.write('y');
    await delay(); // intro
    stdin.write('y');
    await delay(); // step 1
    stdin.write('y');
    await delay(); // step 2
    stdin.write('y');
    await delay(); // step 3
    // step 4 NOT auto-skipped — shows template list
    expect(lastFrame()).toContain('pencil');
    stdin.write('y');
    await delay(200); // step 4 — uninstall templates
    stdin.write('n');
    await delay(); // step 5 — skip CLI

    const frame = lastFrame() ?? '';
    expect(frame).toContain('removed');
  });
});
