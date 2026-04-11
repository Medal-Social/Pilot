// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { ThinkingRow } from './ThinkingRow.js';

describe('ThinkingRow', () => {
  it('renders tool name with diamond indicator', () => {
    const { lastFrame } = render(<ThinkingRow tool="search_docs" />);
    expect(lastFrame()).toContain('◆');
    expect(lastFrame()).toContain('search_docs');
  });
});
