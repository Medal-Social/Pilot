import { useState } from 'react';
import { useInput } from 'ink';
import type { Tab, TabId } from '../types.js';

export interface UseListNavOptions {
  listLength: number;
  tabs: Tab[];
  initialTab?: TabId;
}

export interface UseListNavResult {
  selected: number;
  activeTab: TabId;
}

export function useListNav({ listLength, tabs, initialTab }: UseListNavOptions): UseListNavResult {
  const [selected, setSelected] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? tabs[0]?.id ?? '');

  useInput((input, key) => {
    if (key.downArrow) {
      setSelected((s) => (s + 1) % listLength);
    } else if (key.upArrow) {
      setSelected((s) => (s - 1 + listLength) % listLength);
    } else {
      const num = Number.parseInt(input, 10);
      if (num >= 1 && num <= tabs.length) {
        setActiveTab(tabs[num - 1].id);
        setSelected(0);
      }
    }
  });

  return { selected, activeTab };
}
