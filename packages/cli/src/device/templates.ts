// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface TemplateDependency {
  label: string;
  nixPackage: string;
}

export interface TemplateManifest {
  name: string;
  displayName: string;
  description: string;
  dependencies: TemplateDependency[];
}

export const templates: Record<string, TemplateManifest> = {
  pencil: {
    name: 'pencil',
    displayName: 'Pencil Design Studio',
    description: 'Design engine and code editor extensions',
    dependencies: [
      { label: 'Design engine', nixPackage: 'pencil-mcp' },
      { label: 'Code editor', nixPackage: 'zed' },
    ],
  },
  remotion: {
    name: 'remotion',
    displayName: 'Remotion Video Studio',
    description: 'Video production with Node.js',
    dependencies: [
      { label: 'Video runtime', nixPackage: 'nodejs' },
      { label: 'Media encoder', nixPackage: 'ffmpeg' },
      { label: 'Browser engine', nixPackage: 'chromium' },
    ],
  },
  nextmedal: {
    name: 'nextmedal',
    displayName: 'Next Medal Web App',
    description: 'Full-stack web application',
    dependencies: [
      { label: 'Runtime', nixPackage: 'nodejs' },
      { label: 'Package manager', nixPackage: 'pnpm' },
    ],
  },
};

export function getTemplate(name: string): TemplateManifest | undefined {
  return templates[name];
}

export function getAllTemplateNames(): string[] {
  return Object.keys(templates);
}
