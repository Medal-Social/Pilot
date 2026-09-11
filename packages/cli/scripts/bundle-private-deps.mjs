/**
 * Inline the private workspace packages into the published CLI output.
 *
 * `@medalsocial/kit` is `private: true`, so it is never published to npm. It was
 * nevertheless declared as a runtime `dependency`, and `pnpm publish` rewrites
 * `workspace:*` to the concrete version — so every published tarball carried
 * `"@medalsocial/kit": "0.4.0"` and `npm install @medalsocial/pilot` died with:
 *
 *   npm error 404 Not Found - GET https://registry.npmjs.org/@medalsocial%2fkit
 *
 * The prebuilt binaries were unaffected because `bun build --compile` already
 * inlines everything; only the npm package was broken.
 *
 * `bundledDependencies` is not an option here: pnpm refuses it outright under
 * its default isolated linker (ERR_PNPM_BUNDLED_DEPENDENCIES_WITHOUT_HOISTED),
 * and switching the whole workspace to `nodeLinker: hoisted` to satisfy one
 * package is a far larger change than bundling.
 *
 * So: tsc still emits the real build (and the .d.ts files the `exports` map
 * points at), and this pass rewrites the three entry points with the private
 * packages inlined. Every dependency the published manifest still declares
 * stays external, so nothing else about the dependency graph moves.
 */
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(here, '..');
const pkg = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf8'));

/** Packages that are private to this repo and must be inlined, never declared. */
const INLINE = ['@medalsocial/kit'];

/**
 * Everything the published manifest declares stays external. A package that is
 * neither declared nor inlined would be a silent runtime failure for consumers,
 * so assert rather than guess.
 */
const declared = Object.keys(pkg.dependencies ?? {});
const leaked = INLINE.filter((name) => declared.includes(name));
if (leaked.length > 0) {
  throw new Error(
    `These are inlined but still declared as runtime dependencies, so consumers would try to ` +
      `download them from npm: ${leaked.join(', ')}. Move them to devDependencies.`
  );
}

const ENTRY_POINTS = ['dist/bin/pilot.js', 'dist/index.js', 'dist/runtime/index.js'];
const distDir = resolve(pkgDir, 'dist');

const result = await build({
  absWorkingDir: pkgDir,
  entryPoints: ENTRY_POINTS,
  outdir: 'dist',
  outbase: 'dist',
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'node',
  target: 'node24',
  allowOverwrite: true,
  external: [...declared, 'node:*'],
  logLevel: 'warning',
  metafile: true,
});

const inlined = Object.keys(result.metafile.inputs).filter((input) =>
  INLINE.some((name) => input.includes(name.replace('@medalsocial/', '')))
);
if (inlined.length === 0) {
  throw new Error(
    `Bundling produced no ${INLINE.join('/')} input. The imports were not inlined, so the ` +
      `published package would still be broken. Refusing to emit a tarball that cannot install.`
  );
}

/**
 * tsc emitted the whole module graph as individual files; esbuild has now
 * replaced the three entry points with self-contained bundles plus its own
 * chunks. The leftover per-module .js files are unreachable through the
 * `exports` map, but they still carry bare `@medalsocial/kit` imports — so
 * shipping them leaves a tarball that reads as broken and is roughly twice the
 * size it needs to be. Keep exactly what esbuild emitted, plus every .d.ts.
 *
 * metafile output paths are relative to `absWorkingDir`.
 */
const emitted = new Set(Object.keys(result.metafile.outputs).map((out) => resolve(pkgDir, out)));

for (const entry of ENTRY_POINTS) {
  if (!emitted.has(resolve(pkgDir, entry))) {
    throw new Error(
      `esbuild did not emit ${entry}, which package.json resolves via "bin"/"exports". ` +
        `Refusing to publish a package whose entry points are missing.`
    );
  }
}

let pruned = 0;
for (const entry of readdirSync(distDir, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const full = resolve(entry.parentPath ?? entry.path, entry.name);
  if (!full.endsWith('.js') && !full.endsWith('.js.map')) continue;
  const js = full.endsWith('.map') ? full.slice(0, -4) : full;
  if (emitted.has(js)) continue;
  rmSync(full);
  pruned += 1;
}

console.log(
  `bundled ${inlined.length} private-package modules into the CLI entry points, ` +
    `pruned ${pruned} unbundled tsc artefacts`
);
