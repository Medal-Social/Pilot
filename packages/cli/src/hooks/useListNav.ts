import { useEffect, useState } from 'react';
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

  // Clamp selected when list length changes (e.g. after tab switch filters the list)
  useEffect(() => {
    setSelected((s) => (listLength > 0 ? Math.min(s, listLength - 1) : 0));
  }, [listLength]);

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
