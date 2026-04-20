import { execFileSync } from 'node:child_process';

const stagedFiles = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
  encoding: 'utf8',
})
  .split('\n')
  .map((file) => file.trim())
  .filter(Boolean);

if (stagedFiles.length === 0) {
  process.exit(0);
}

execFileSync('pnpm', ['exec', 'secretlint', ...stagedFiles], {
  stdio: 'inherit',
});
