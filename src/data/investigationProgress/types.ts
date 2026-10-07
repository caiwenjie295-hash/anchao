import type { AppId } from '../../core/types';

export type ProgressNodeStatus = 'complete' | 'current' | 'known' | 'upcoming';

export interface InvestigationProgressNode {
  id: string;
  label: string;
  status: ProgressNodeStatus;
  detail?: string;
}

export interface InvestigationProgressFact {
  id: string;
  title: string;
  source: string;
  summary: string;
  status: 'read' | 'noted' | 'recorded' | 'inspected';
}

export interface InvestigationProgressModel {
  act: 1 | 2 | 3 | 4;
  actLabel: string;
  location: string;
  currentObjective: string;
  nextAction: string;
  nextActionAppId?: AppId;
  route: readonly InvestigationProgressNode[];
  knownFacts: readonly InvestigationProgressFact[];
  pendingDirections: readonly string[];
}

export interface DesktopTaskStep {
  id: string;
  label: string;
  hint?: string;
  complete: boolean;
  current: boolean;
  appId?: AppId;
}

export interface DesktopTaskPresentation {
  title: string;
  summary: string;
  completedCount: number;
  totalCount: number;
  steps: readonly DesktopTaskStep[];
  nextAction: string;
  actionAppId?: AppId;
  actionLabel?: string;
}
