// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';
import { getAllTemplateNames, getTemplate, templates } from './templates.js';

describe('templates', () => {
  it('exports known templates', () => {
    expect(templates).toHaveProperty('pencil');
    expect(templates).toHaveProperty('remotion');
    expect(templates).toHaveProperty('nextmedal');
  });
});

describe('getTemplate', () => {
  it('returns template by name', () => {
    const t = getTemplate('pencil');
    expect(t).toBeDefined();
    expect(t?.name).toBe('pencil');
    expect(t?.dependencies.length).toBeGreaterThan(0);
  });

  it('returns undefined for unknown template', () => {
    expect(getTemplate('nonexistent')).toBeUndefined();
  });
});

describe('getAllTemplateNames', () => {
  it('returns all template names', () => {
    const names = getAllTemplateNames();
    expect(names).toContain('pencil');
    expect(names).toContain('remotion');
    expect(names).toContain('nextmedal');
  });
});
