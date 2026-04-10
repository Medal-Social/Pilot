export interface KnowledgeSource {
  id: string;
  type: 'sanity' | 'slack' | 'manual';
  name: string;
  description: string;
  connected: boolean;
  lastSync?: string;
  documentCount?: number;
}

export interface TrainingRun {
  id: number;
  status: 'running' | 'complete' | 'failed';
  steps: Array<{
    label: string;
    status: 'done' | 'active' | 'waiting';
  }>;
  sourcesIncluded: string[];
  outputFiles: string[];
}
