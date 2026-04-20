import { execFileSync } from 'node:child_process';

const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
  encoding: 'utf8',
})
  .split('\0')
  .map((file) => file.trim())
  .filter(Boolean);

if (trackedFiles.length === 0) {
  process.exit(0);
}

execFileSync('pnpm', ['exec', 'secretlint', ...trackedFiles], {
  stdio: 'inherit',
});
