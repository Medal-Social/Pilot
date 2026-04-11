// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { colors } from '../colors.js';
import type { CrewMember } from '../types.js';

export const defaultCrew: CrewMember[] = [
  {
    role: 'Brand Lead',
    description: 'Learns your voice, trains all other leads',
    skills: ['brand-voice', 'tone-analysis'],
    color: colors.primary,
  },
  {
    role: 'Marketing Lead',
    description: 'Social posts, campaigns, content calendar',
    skills: ['content-writer', 'social-scheduler'],
    color: colors.success,
  },
  {
    role: 'Tech Lead',
    description: 'Suite builds, deploys, code review',
    skills: ['nextmedal', 'deploy'],
    color: colors.info,
  },
  {
    role: 'CS Lead',
    description: 'Tickets, escalation, customer retention',
    skills: ['support-agent'],
    color: colors.warning,
  },
  {
    role: 'Sales Lead',
    description: 'Outreach, pipeline, lead scoring',
    skills: ['outreach'],
    color: colors.error,
  },
];
