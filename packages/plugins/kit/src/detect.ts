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

/**
 * Pick the configured machine for a host, the same way `pilot kit` does:
 * the curated pattern match wins when it is configured, otherwise the raw
 * hostname (and its short form, for FQDNs) is tried as a direct config key so
 * machines outside the pattern map still resolve. Returns null when nothing
 * matches so callers decide how to fall back.
 */
export function resolveConfiguredMachine(
  machines: Record<string, unknown>,
  host: string
): string | null {
  // Own-key check only: `in` would accept inherited names like "toString".
  const configured = (id: string): boolean => Object.hasOwn(machines, id);
  const detected = detectMachine(host);
  if (detected && configured(detected)) return detected;
  if (configured(host)) return host;
  const hostShort = host.split('.')[0] ?? host;
  if (hostShort !== host && configured(hostShort)) return hostShort;
  return null;
}
