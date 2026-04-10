import type { PluginManifest } from './manifest.js';

export interface LoadedPlugin {
  manifest: PluginManifest;
  id: string;
  enabled: boolean;
  path: string;
}

export interface PluginRegistry {
  plugins: LoadedPlugin[];
  getPlugin(id: string): LoadedPlugin | undefined;
  enabledPlugins(): LoadedPlugin[];
  enable(id: string): void;
  disable(id: string): void;
  remove(id: string): void;
}
