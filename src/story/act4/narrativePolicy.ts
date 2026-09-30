import type { Act4NarrativeActionId, Act4Stage } from '../../core/types';

export type ActiveAct4NarrativeStage = Exclude<Act4Stage, 'inactive'>;

export const act4NarrativeStageSequence: readonly ActiveAct4NarrativeStage[] = [
  'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08', 'T09', 'T10',
];

export const act4NarrativeRequiredActions: Partial<Record<ActiveAct4NarrativeStage, readonly Act4NarrativeActionId[]>> = {
  T02: ['A4_T02_LOGIN_SUCCEEDED'],
  T04: ['A4_T04_WAKE_MAIL_OPENED'],
  T08: ['A4_T08_ARCHIVE_OPENED'],
  T09: ['A4_T09_NOTE_HIDDEN', 'A4_T09_DOOR_EXITED'],
  T10: ['A4_T10_FINAL_MAIL_OPENED'],
};

export const act4NarrativeSectionId = (stage: ActiveAct4NarrativeStage): string => `A4_READ_${stage}`;

export const act4NarrativeActionsSatisfied = (
  stage: ActiveAct4NarrativeStage,
  completedActionIds: readonly Act4NarrativeActionId[],
): boolean => (act4NarrativeRequiredActions[stage] ?? []).every((actionId) => completedActionIds.includes(actionId));
