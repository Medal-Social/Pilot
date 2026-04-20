// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Text } from 'ink';
import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { Modal } from './Modal.js';

describe('Modal', () => {
  it('renders title and children', () => {
    const { lastFrame } = render(
      <Modal title="Confirm">
        <Text>Are you sure?</Text>
      </Modal>
    );
    expect(lastFrame()).toContain('Confirm');
    expect(lastFrame()).toContain('Are you sure?');
    expect(lastFrame()).toContain('esc');
  });

  it('renders footer when provided', () => {
    const { lastFrame } = render(
      <Modal title="Test" footer={<Text>Press Enter</Text>}>
        <Text>Content</Text>
      </Modal>
    );
    expect(lastFrame()).toContain('Press Enter');
  });

  it('renders without footer when not provided', () => {
    const { lastFrame } = render(
      <Modal title="Test">
        <Text>Content</Text>
      </Modal>
    );
    expect(lastFrame()).toContain('Content');
  });
});
