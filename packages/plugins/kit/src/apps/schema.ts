// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

export const HOMEBREW_NAME = /^[a-z0-9][a-z0-9._@+-]*$/;

const name = z.string().regex(HOMEBREW_NAME, 'invalid Homebrew package name');

export const appsSchema = z.object({
  casks: z.array(name),
  brews: z.array(name),
});

export type Apps = z.infer<typeof appsSchema>;
