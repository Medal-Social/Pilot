// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { Header } from './Header.js';

describe('<Header />', () => {
  it('renders machine name and OS info', () => {
    const { lastFrame } = render(
      <Header machine="ali-pro" os="macOS" osVersion="15.4" chip="Apple Silicon" user="ali" />
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('ali-pro');
    expect(frame).toContain('macOS 15.4');
    expect(frame).toContain('Apple Silicon');
    expect(frame).toContain('ali');
  });
});
