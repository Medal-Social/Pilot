import type { CrewMember } from '../types.js';

export const defaultCrew: CrewMember[] = [
  {
    role: 'Brand Lead',
    description: 'Learns your voice, trains all other leads',
    skills: ['brand-voice', 'tone-analysis'],
    color: '#9A6AC2',
  },
  {
    role: 'Marketing Lead',
    description: 'Social posts, campaigns, content calendar',
    skills: ['content-writer', 'social-scheduler'],
    color: '#2DD4BF',
  },
  {
    role: 'Tech Lead',
    description: 'Suite builds, deploys, code review',
    skills: ['nextmedal', 'deploy'],
    color: '#3B82F6',
  },
  {
    role: 'CS Lead',
    description: 'Tickets, escalation, customer retention',
    skills: ['support-agent'],
    color: '#F59E0B',
  },
  {
    role: 'Sales Lead',
    description: 'Outreach, pipeline, lead scoring',
    skills: ['outreach'],
    color: '#EF4444',
  },
];
