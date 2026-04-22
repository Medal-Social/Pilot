// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

export const PkgStepSchema = z.object({
  type: z.literal('pkg'),
  nix: z.string().optional(),
  brew: z.string().optional(),
  winget: z.string().optional(),
  label: z.string(),
});

export const NpmStepSchema = z.object({
  type: z.literal('npm'),
  pkg: z.string(),
  global: z.boolean(),
  label: z.string(),
});

export const McpStepSchema = z.object({
  type: z.literal('mcp'),
  server: z.string(),
  command: z.string(),
  label: z.string(),
});

export const ZedExtStepSchema = z.object({
  type: z.literal('zed-extension'),
  id: z.string(),
  label: z.string(),
});

export const SkillStepSchema = z.object({
  type: z.literal('skill'),
  id: z.string(),
  url: z.string().url(),
  label: z.string(),
});

export const AnyStepSchema = z.discriminatedUnion('type', [
  PkgStepSchema,
  NpmStepSchema,
  McpStepSchema,
  ZedExtStepSchema,
  SkillStepSchema,
]);

export const CrewEntrySchema = z.object({
  specialist: z.string(),
  displayName: z.string(),
  skills: z.array(z.string()),
});

export const TemplateEntrySchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  version: z.string(),
  category: z.string(),
  platforms: z.array(z.string()),
  steps: z.array(AnyStepSchema),
  crew: CrewEntrySchema.optional(),
  completionHint: z.string().optional(),
});

export const RegistryIndexSchema = z.object({
  version: z.number(),
  publishedAt: z.string(),
  sha256: z.string(),
  templates: z.array(TemplateEntrySchema),
});

export type PkgStep = z.infer<typeof PkgStepSchema>;
export type NpmStep = z.infer<typeof NpmStepSchema>;
export type McpStep = z.infer<typeof McpStepSchema>;
export type ZedExtStep = z.infer<typeof ZedExtStepSchema>;
export type SkillStep = z.infer<typeof SkillStepSchema>;
export type AnyStep = z.infer<typeof AnyStepSchema>;
export type CrewEntry = z.infer<typeof CrewEntrySchema>;
export type TemplateEntry = z.infer<typeof TemplateEntrySchema>;
export type RegistryIndex = z.infer<typeof RegistryIndexSchema>;
