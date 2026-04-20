// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

export const machineSchema = z.object({
  type: z.enum(['darwin', 'nixos']),
  user: z.string().min(1),
});

export const kitConfigSchema = z.object({
  name: z.string().min(1),
  repo: z.string().min(1),
  // Optional in the file — derived from the config file's directory at load time.
  // Only set if the kit repo lives somewhere other than the config's directory.
  repoDir: z.string().min(1).optional(),
  machines: z.record(z.string(), machineSchema).refine((m) => Object.keys(m).length > 0, {
    message: 'machines map must not be empty',
  }),
});

export type Machine = z.infer<typeof machineSchema>;
export type KitConfig = z.infer<typeof kitConfigSchema>;
