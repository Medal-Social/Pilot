// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { detectMachine, resolveConfiguredMachine } from './detect.js';

describe('detectMachine', () => {
  it('detects ali-mini from hostname containing mini', () => {
    expect(detectMachine('Alis-Mac-mini')).toBe('ali-mini');
  });

  it('detects ali-studio from hostname containing studio', () => {
    expect(detectMachine('ali-studio')).toBe('ali-studio');
  });

  it('detects ali-pro from hostname containing pro', () => {
    expect(detectMachine('Alis-MacBook-Pro')).toBe('ali-pro');
  });

  it('detects ada-air from hostname containing ada or air', () => {
    expect(detectMachine('Adas-MacBook-Air')).toBe('ada-air');
  });

  it('returns null for unknown hostname', () => {
    expect(detectMachine('random-machine')).toBeNull();
  });

  it('does not match partial segments like production or project', () => {
    expect(detectMachine('production-node')).toBeNull();
    expect(detectMachine('project-box')).toBeNull();
    expect(detectMachine('administrator-pc')).toBeNull();
  });
});

describe('resolveConfiguredMachine', () => {
  const machines = { 'ali-pro': {}, 'my-vm': {} };

  it('prefers the pattern match when it is configured', () => {
    expect(resolveConfiguredMachine(machines, 'Alis-MacBook-Pro')).toBe('ali-pro');
  });

  it('falls back to the raw hostname when it is a configured key', () => {
    expect(resolveConfiguredMachine(machines, 'my-vm')).toBe('my-vm');
  });

  it('strips an FQDN suffix before the raw-hostname lookup', () => {
    expect(resolveConfiguredMachine(machines, 'my-vm.local')).toBe('my-vm');
  });

  it('ignores a pattern match that is not configured and still tries the hostname', () => {
    // "mini" matches the ali-mini pattern, but only "alis-mac-mini" is configured.
    expect(resolveConfiguredMachine({ 'alis-mac-mini': {} }, 'alis-mac-mini')).toBe(
      'alis-mac-mini'
    );
  });

  it('returns null when nothing matches', () => {
    expect(resolveConfiguredMachine(machines, 'unrelated-host')).toBeNull();
  });
});
