// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import * as fs from 'node:fs';
import * as os from 'node:os';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { removeRoutingFromClaudeMd, removeSkillSymlink } from './deployer.js';

vi.mock('node:fs');
vi.mock('node:os');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(os.homedir).mockReturnValue('/mock/home');
});

describe('removeRoutingFromClaudeMd', () => {
  it('removes routing section preserving other content', () => {
    const input = [
      '# Global Instructions',
      '',
      'Some content here.',
      '',
      '## Pilot routing',
      '',
      'Route /pilot to crew.',
      '',
      '## Other section',
      '',
      'Keep this.',
    ].join('\n');

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(input);

    const result = removeRoutingFromClaudeMd();

    expect(result.success).toBe(true);
    expect(result.skipped).toBeUndefined();

    const written = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
    expect(written).toContain('# Global Instructions');
    expect(written).toContain('## Other section');
    expect(written).toContain('Keep this.');
    expect(written).not.toContain('## Pilot routing');
    expect(written).not.toContain('Route /pilot to crew.');
  });

  it('removes routing section at end of file (no following heading)', () => {
    const input = [
      '# Global Instructions',
      '',
      'Some content here.',
      '',
      '## Pilot routing',
      '',
      'Route /pilot to crew.',
    ].join('\n');

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(input);

    const result = removeRoutingFromClaudeMd();

    expect(result.success).toBe(true);

    const written = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
    expect(written).toContain('# Global Instructions');
    expect(written).toContain('Some content here.');
    expect(written).not.toContain('## Pilot routing');
    expect(written).not.toContain('Route /pilot to crew.');
  });

  it('returns skip when CLAUDE.md does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = removeRoutingFromClaudeMd();

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('returns skip when routing section not found', () => {
    const input = '# Global Instructions\n\nSome content here.\n';

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(input);

    const result = removeRoutingFromClaudeMd();

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});

describe('removeSkillSymlink', () => {
  it('removes symlink when it exists', () => {
    vi.mocked(fs.lstatSync).mockReturnValue({ isSymbolicLink: () => true } as fs.Stats);

    const result = removeSkillSymlink();

    expect(result.success).toBe(true);
    expect(result.skipped).toBeUndefined();
    expect(fs.unlinkSync).toHaveBeenCalledWith('/mock/home/.claude/skills/pilot');
  });

  it('skips when symlink does not exist', () => {
    vi.mocked(fs.lstatSync).mockImplementation(() => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });

    const result = removeSkillSymlink();

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });

  it('skips when path is not a symlink', () => {
    vi.mocked(fs.lstatSync).mockReturnValue({ isSymbolicLink: () => false } as fs.Stats);

    const result = removeSkillSymlink();

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });
});
