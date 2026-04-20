// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { ThinkingRow } from './ThinkingRow.js';

describe('ThinkingRow', () => {
  it('renders tool name with diamond indicator', () => {
    const { lastFrame } = render(<ThinkingRow tool="search_docs" />);
    expect(lastFrame()).toContain('◆');
    expect(lastFrame()).toContain('search_docs');
  });
});
