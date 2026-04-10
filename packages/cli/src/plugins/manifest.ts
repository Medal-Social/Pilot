import { z } from 'zod';

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
    .default({}),
  permissions: z
    .object({
      network: z.array(z.string()).optional().default([]),
    })
    .optional()
    .default({}),
  roleBindings: z.record(z.string(), z.string()).optional().default({}),
});

export type PluginManifest = z.infer<typeof manifestSchema>;

export function parseManifest(raw: unknown) {
  return manifestSchema.safeParse(raw);
}

export function pluginId(manifest: PluginManifest): string {
  return `@${manifest.namespace}/${manifest.name}`;
}
