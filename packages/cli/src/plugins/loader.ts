import type { LoadedPlugin, PluginRegistry } from './types.js';

export function createRegistry(initial: LoadedPlugin[]): PluginRegistry {
  const plugins = [...initial];

  return {
    plugins,

    getPlugin(id: string) {
      return plugins.find((p) => p.id === id);
    },

    enabledPlugins() {
      return plugins.filter((p) => p.enabled);
    },

    enable(id: string) {
      const plugin = plugins.find((p) => p.id === id);
      if (plugin) plugin.enabled = true;
    },

    disable(id: string) {
      const plugin = plugins.find((p) => p.id === id);
      if (plugin) plugin.enabled = false;
    },

    remove(id: string) {
      const idx = plugins.findIndex((p) => p.id === id);
      if (idx !== -1) plugins.splice(idx, 1);
    },
  };
}
