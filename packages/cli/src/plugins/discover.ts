import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import { bundledPlugins } from './bundled.js';
import { parseManifest, pluginId } from './manifest.js';
import type { LoadedPlugin } from './types.js';

interface DiscoverOptions {
  userDir: string;
  enabledState: Record<string, { enabled: boolean }>;
}

function scanDir(dir: string, enabledState: Record<string, { enabled: boolean }>): LoadedPlugin[] {
  if (!existsSync(dir)) return [];

  const entries = readdirSync(dir);
  const plugins: LoadedPlugin[] = [];

  for (const entry of entries) {
    const pluginDir = join(dir, String(entry));
    const tomlPath = join(pluginDir, 'plugin.toml');

    if (!existsSync(tomlPath)) continue;

    let raw: string;
    let parsed: Record<string, unknown>;
    try {
      raw = readFileSync(tomlPath, 'utf-8');
      parsed = parseToml(raw) as Record<string, unknown>;
    } catch {
      continue;
    }

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
  // Start with bundled plugins, apply enabled state
  const bundled = bundledPlugins.map((p) => ({
    ...p,
    enabled: options.enabledState[p.id]?.enabled ?? p.enabled,
  }));

  // Scan user-installed plugins
  const user = scanDir(options.userDir, options.enabledState);

  // Deduplicate by id, user plugins override bundled
  const byId = new Map<string, LoadedPlugin>();
  for (const p of bundled) byId.set(p.id, p);
  for (const p of user) byId.set(p.id, p);

  return [...byId.values()];
}
