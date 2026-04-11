// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseManifest } from './manifest.js';

describe('parseManifest fuzz', () => {
  it('never throws on arbitrary input', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        const result = parseManifest(input);
        expect(result).toHaveProperty('success');
      }),
      { numRuns: 1000 }
    );
  });

  it('handles structured random manifests without throwing', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1 }),
          namespace: fc.string({ minLength: 1 }),
          description: fc.string(),
          provides: fc.option(
            fc.record({
              commands: fc.option(fc.array(fc.string()), { nil: undefined }),
              mcpServers: fc.option(fc.array(fc.string()), { nil: undefined }),
            }),
            { nil: undefined }
          ),
          permissions: fc.option(
            fc.record({
              network: fc.option(fc.array(fc.string()), { nil: undefined }),
            }),
            { nil: undefined }
          ),
        }),
        (input) => {
          const result = parseManifest(input);
          // A well-formed structured input must always parse successfully
          expect(result.success).toBe(true);
          if (result.success) {
            expect(typeof result.data.name).toBe('string');
            expect(typeof result.data.namespace).toBe('string');
          }
        }
      ),
      { numRuns: 1000 }
    );
  });
});
