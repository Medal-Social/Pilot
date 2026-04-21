// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Text, useInput } from 'ink';
import { useMemo, useState } from 'react';
import { colors } from '../colors.js';
import { SplitPanel } from '../components/SplitPanel.js';
import { StatusBar } from '../components/StatusBar.js';
import type { RegistryIndex, TemplateEntry } from '../registry/types.js';

const ALL_CATEGORY = 'all';

interface UpBrowseProps {
  registry: RegistryIndex;
  installedNames: string[];
  onInstall: (template: TemplateEntry) => void;
}

export function UpBrowse({ registry, installedNames, onInstall }: UpBrowseProps) {
  const categories = useMemo(() => {
    const unique = Array.from(new Set(registry.templates.map((t) => t.category)));
    return [ALL_CATEGORY, ...unique];
  }, [registry.templates]);

  const [activePanel, setActivePanel] = useState<'categories' | 'templates'>('categories');
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState(0);

  const activeCategory = categories[selectedCategory] ?? ALL_CATEGORY;

  const displayTemplates = useMemo(() => {
    if (activeCategory === ALL_CATEGORY) return registry.templates;
    return registry.templates.filter((t) => t.category === activeCategory);
  }, [registry.templates, activeCategory]);

  useInput((input, key) => {
    if (activePanel === 'categories') {
      if (key.downArrow) {
        setSelectedCategory((s) => (s + 1) % categories.length);
        setSelectedTemplate(0);
      } else if (key.upArrow) {
        setSelectedCategory((s) => (s - 1 + categories.length) % categories.length);
        setSelectedTemplate(0);
      } else if (key.rightArrow || key.return) {
        if (displayTemplates.length > 0) setActivePanel('templates');
      }
    } else {
      if (key.downArrow) {
        if (displayTemplates.length > 0)
          setSelectedTemplate((s) => (s + 1) % displayTemplates.length);
      } else if (key.upArrow) {
        if (displayTemplates.length > 0)
          setSelectedTemplate((s) => (s - 1 + displayTemplates.length) % displayTemplates.length);
      } else if (key.leftArrow) {
        setActivePanel('categories');
      } else if (key.return) {
        const tpl = displayTemplates[selectedTemplate];
        if (tpl) onInstall(tpl);
      }
    }

    if (input === 'q') process.exit(0);
  });

  const currentTemplate = displayTemplates[selectedTemplate];

  return (
    <Box flexDirection="column" height="100%">
      <Box paddingX={1} paddingY={0} flexDirection="column">
        <Text bold color={colors.text}>
          Pilot Up
        </Text>
        <Text color={colors.muted}>Browse and install templates</Text>
      </Box>
      <SplitPanel
        sidebarWidth={24}
        sidebar={
          <Box flexDirection="column">
            {categories.map((cat, i) => {
              const isActive = i === selectedCategory;
              const isFocused = activePanel === 'categories';
              return (
                <Box key={cat} paddingX={1}>
                  <Text
                    bold={isActive}
                    color={
                      isActive && isFocused ? colors.primary : isActive ? colors.text : colors.muted
                    }
                  >
                    {isActive ? '▸ ' : '  '}
                    {cat === ALL_CATEGORY ? 'All' : cat}
                  </Text>
                </Box>
              );
            })}
          </Box>
        }
        detail={
          <Box flexDirection="column" gap={0}>
            {displayTemplates.length === 0 ? (
              <Text color={colors.muted}>No templates in this category</Text>
            ) : (
              displayTemplates.map((tpl, i) => {
                const isSelected = i === selectedTemplate;
                const isFocused = activePanel === 'templates';
                const isInstalled = installedNames.includes(tpl.name);
                return (
                  <Box key={tpl.name} flexDirection="column" paddingY={0}>
                    <Box gap={1}>
                      <Text
                        bold={isSelected}
                        color={
                          isSelected && isFocused
                            ? colors.primary
                            : isSelected
                              ? colors.text
                              : colors.muted
                        }
                      >
                        {isInstalled ? '● ' : '○ '}
                        {tpl.displayName}
                        {isInstalled ? ' [installed]' : ''}
                      </Text>
                    </Box>
                    {isSelected && (
                      <Box paddingLeft={2}>
                        <Text color={colors.muted}>{tpl.description}</Text>
                      </Box>
                    )}
                  </Box>
                );
              })
            )}
          </Box>
        }
      />
      <StatusBar
        items={[
          { label: '↑↓ navigate', color: colors.muted },
          { label: '←→ switch panels', color: colors.muted },
          { label: 'Enter install · q quit', color: colors.muted },
        ]}
      />
    </Box>
  );
}
