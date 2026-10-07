import type { Act2Stage, Act3Stage, Act4Stage, WindowStatus } from '../types';
import { act4NarrativeStageSequence } from '../../story/act4/narrativePolicy';

/** The supported persisted envelope versions remain exactly schema 1 through 13. */
export const SUPPORTED_SAVE_SCHEMA_VERSIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;
export const validStatuses: readonly WindowStatus[] = ['closed', 'normal', 'minimized', 'maximized'];
export const validAct2Stages: readonly Act2Stage[] = ['inactive', 'search', 'bridge', 'library', 'tales', 'school', 'qiming', 'finale'];
export const validAct3Stages: readonly Act3Stage[] = ['inactive', 'T00', 'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07'];
export const act4Stages: readonly Act4Stage[] = ['inactive', ...act4NarrativeStageSequence];
export const act4PuzzleIds = Array.from({ length: 24 }, (_, index) => `A4_P${String(index + 1).padStart(2, '0')}`);
export const validSavePhases = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
  ...Array.from({ length: 7 }, (_, index) => `A2_T${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 8 }, (_, index) => `A3_T${String(index).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `A4_T${String(index + 1).padStart(2, '0')}`),
]);

export function isSupportedSaveSchemaVersion(value: unknown): value is (typeof SUPPORTED_SAVE_SCHEMA_VERSIONS)[number] {
  return typeof value === 'number' && Number.isInteger(value) && (SUPPORTED_SAVE_SCHEMA_VERSIONS as readonly number[]).includes(value);
}
