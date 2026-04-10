import { describe, expect, it } from 'vitest';
import { detectMachine } from './detect.js';

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
