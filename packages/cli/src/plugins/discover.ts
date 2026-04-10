import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import { parseManifest, pluginId } from './manifest.js';
import type { LoadedPlugin } from './types.js';

interface DiscoverOptions {
  bundledDir: string;
  userDir: string;
  enabledState: Record<string, { enabled: boolean }>;
}

function scanDir(
  dir: string,
  enabledState: Record<string, { enabled: boolean }>,
): LoadedPlugin[] {
  if (!existsSync(dir)) return [];

  const entries = readdirSync(dir);
  const plugins: LoadedPlugin[] = [];

  for (const entry of entries) {
    const pluginDir = join(dir, String(entry));
    const tomlPath = join(pluginDir, 'plugin.toml');

    if (!existsSync(tomlPath)) continue;

    const raw = readFileSync(tomlPath, 'utf-8');
    const parsed = parseToml(raw);
    const result = parseManifest(parsed);

    if (!result.success) continue;

    const id = pluginId(result.data);
    const state = enabledState[id];

    plugins.push({
      manifest: result.data,
      id,
      enabled: state?.enabled ?? true,
      path: pluginDir,
    });
  }

  return plugins;
}

export function discoverPlugins(options: DiscoverOptions): LoadedPlugin[] {
  const bundled = scanDir(options.bundledDir, options.enabledState);
  const user = scanDir(options.userDir, options.enabledState);

  // Deduplicate by id, user plugins override bundled
  const byId = new Map<string, LoadedPlugin>();
  for (const p of bundled) byId.set(p.id, p);
  for (const p of user) byId.set(p.id, p);

  return [...byId.values()];
}
