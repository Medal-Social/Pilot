import { describe, expect, it } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Text } from 'ink';
import { useListNav } from './useListNav.js';

const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));

function TestComponent({ listLength, tabs }: { listLength: number; tabs: string[] }) {
  const { selected, activeTab } = useListNav({
    listLength,
    tabs: tabs.map((label, i) => ({ id: String(i), label })),
  });

  return <Text>selected={selected} tab={activeTab}</Text>;
}

describe('useListNav', () => {
  it('starts at selected=0 and first tab', () => {
    const { lastFrame } = render(
      <TestComponent listLength={3} tabs={['A', 'B', 'C']} />
    );
    expect(lastFrame()).toContain('selected=0');
    expect(lastFrame()).toContain('tab=0');
  });

  it('moves selection down with arrow key', async () => {
    const { lastFrame, stdin } = render(
      <TestComponent listLength={3} tabs={['A', 'B']} />
    );
    await delay();
    stdin.write('\x1B[B');
    await delay();
    expect(lastFrame()).toContain('selected=1');
  });

  it('moves selection up with arrow key', async () => {
    const { lastFrame, stdin } = render(
      <TestComponent listLength={3} tabs={['A', 'B']} />
    );
    await delay();
    stdin.write('\x1B[B');
    await delay();
    stdin.write('\x1B[A');
    await delay();
    expect(lastFrame()).toContain('selected=0');
  });

  it('wraps selection at boundaries', async () => {
    const { lastFrame, stdin } = render(
      <TestComponent listLength={3} tabs={['A', 'B']} />
    );
    await delay();
    stdin.write('\x1B[A');
    await delay();
    expect(lastFrame()).toContain('selected=2');
  });

  it('switches tab with number keys', async () => {
    const { lastFrame, stdin } = render(
      <TestComponent listLength={3} tabs={['A', 'B', 'C']} />
    );
    await delay();
    stdin.write('2');
    await delay();
    expect(lastFrame()).toContain('tab=1');
  });

  it('resets selection when switching tabs', async () => {
    const { lastFrame, stdin } = render(
      <TestComponent listLength={3} tabs={['A', 'B']} />
    );
    await delay();
    stdin.write('\x1B[B');
    await delay();
    stdin.write('2');
    await delay();
    expect(lastFrame()).toContain('selected=0');
    expect(lastFrame()).toContain('tab=1');
  });

  it('does not navigate when list is empty', async () => {
    const { lastFrame, stdin } = render(
      <TestComponent listLength={0} tabs={['A', 'B']} />
    );
    expect(lastFrame()).toContain('selected=0');
    await delay();
    stdin.write('\x1B[B');
    await delay();
    // With 0 items, selected should stay 0 and not wrap
    expect(lastFrame()).toContain('selected=0');
    stdin.write('\x1B[A');
    await delay();
    expect(lastFrame()).toContain('selected=0');
  });
});
