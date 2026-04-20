// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const MACHINE_PATTERNS: Array<{ pattern: string; machine: string }> = [
  { pattern: 'mini', machine: 'ali-mini' },
  { pattern: 'studio', machine: 'ali-studio' },
  { pattern: 'ada', machine: 'ada-air' },
  { pattern: 'air', machine: 'ada-air' },
  { pattern: 'pro', machine: 'ali-pro' },
  { pattern: 'oslo', machine: 'oslo-server' },
];

export function detectMachine(hostname: string): string | null {
  const lower = hostname.toLowerCase();
  const segments = lower.split(/[-_.]/);
  for (const { pattern, machine } of MACHINE_PATTERNS) {
    if (segments.includes(pattern)) return machine;
  }
  return null;
}
