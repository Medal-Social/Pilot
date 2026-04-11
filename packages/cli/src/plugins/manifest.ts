import { z } from 'zod';
import { PilotError, errorCodes } from '../errors.js';

export const manifestSchema = z.object({
  name: z.string().min(1),
  namespace: z.string().min(1),
  description: z.string(),
  provides: z
    .object({
      commands: z.array(z.string()).optional().default([]),
      mcpServers: z.array(z.string()).optional().default([]),
    })
    .optional()
    .default({ commands: [], mcpServers: [] }),
  permissions: z
    .object({
      network: z.array(z.string()).optional().default([]),
    })
    .optional()
    .default({ network: [] }),
  roleBindings: z.record(z.string(), z.string()).optional().default({}),
});

export type PluginManifest = z.infer<typeof manifestSchema>;

export function parseManifest(raw: unknown) {
  return manifestSchema.safeParse(raw);
}

export function pluginId(manifest: PluginManifest): string {
  if (!manifest.namespace || !manifest.name) {
    throw new PilotError(errorCodes.PLUGIN_INVALID_MANIFEST);
  }
  return `@${manifest.namespace}/${manifest.name}`;
}
