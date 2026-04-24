// Reads version from package.json and writes src/version.ts
// Portable across macOS, Linux, and Windows (no shell quirks).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(here, '..');
const pkg = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf8'));

const contents = `// Auto-generated at build time — do not edit manually
export const VERSION = '${pkg.version}';
`;

writeFileSync(resolve(pkgDir, 'src/version.ts'), contents);
