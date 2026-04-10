import { existsSync, lstatSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export type RemovalResult = { success: boolean; skipped?: boolean };

const ROUTING_HEADING = '## Pilot routing';

/**
 * Removes the "## Pilot routing" section from ~/.claude/CLAUDE.md.
 * Preserves all other content and collapses triple+ newlines to double.
 */
export function removeRoutingFromClaudeMd(): RemovalResult {
  const claudeMdPath = join(homedir(), '.claude', 'CLAUDE.md');

  if (!existsSync(claudeMdPath)) {
    return { success: true, skipped: true };
  }

  const content = readFileSync(claudeMdPath, 'utf8') as string;
  const lines = content.split('\n');

  const startIndex = lines.findIndex((line) => line.trimEnd() === ROUTING_HEADING);
  if (startIndex === -1) {
    return { success: true, skipped: true };
  }

  // Find the next ## heading after the routing section, or EOF
  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      endIndex = i;
      break;
    }
  }

  const kept = [...lines.slice(0, startIndex), ...lines.slice(endIndex)];
  // Collapse triple+ blank lines to double
  const cleaned = kept.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';

  writeFileSync(claudeMdPath, cleaned, 'utf8');
  return { success: true };
}

/**
 * Removes the ~/.claude/skills/pilot symlink if it exists and is a symlink.
 */
export function removeSkillSymlink(): RemovalResult {
  const symlinkPath = join(homedir(), '.claude', 'skills', 'pilot');

  let stat: ReturnType<typeof lstatSync>;
  try {
    stat = lstatSync(symlinkPath);
  } catch {
    return { success: true, skipped: true };
  }

  if (!stat.isSymbolicLink()) {
    return { success: true, skipped: true };
  }

  unlinkSync(symlinkPath);
  return { success: true };
}
