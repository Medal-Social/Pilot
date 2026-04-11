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
});
