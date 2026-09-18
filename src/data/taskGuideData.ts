import taskGuidesDocument from '../../data/task_guides.json';
import type { AppId, AppState } from '../core/types';
import { isSymbolVisible } from './photoData';

type CompletionKind = 'cave-photo-opened' | 'cave-symbol-visible';

type TaskGuideStepDefinition = {
  label: string;
  completionFlag?: string;
  completionKind?: CompletionKind;
  appId?: AppId;
};

type TaskGuideDefinition = {
  id: string;
  phases: string[];
  prerequisiteFlags: string[];
  completionFlags: string[];
  summary: string;
  steps: TaskGuideStepDefinition[];
};

type TaskGuideDocument = { schemaVersion: 1; items: TaskGuideDefinition[] };

export type TaskGuideStep = Readonly<{
  label: string;
  complete: boolean;
  current: boolean;
  appId?: AppId;
}>;

export type TaskGuide = Readonly<{
  id: string;
  title: '当前待办';
  summary: string;
  completedCount: number;
  totalCount: number;
  steps: readonly TaskGuideStep[];
  actionAppId?: AppId;
  actionLabel?: string;
}>;

const document = taskGuidesDocument as TaskGuideDocument;
const CAVE_PHOTO_ID = 'IMG_A1_H_003';

const actionLabels: Record<AppId, string> = {
  wechat: '打开微信',
  mail: '打开邮箱',
  browser: '打开浏览器',
  explorer: '打开资源管理器',
  notepad: '打开记事本',
  photos: '打开照片',
};

const hasFlag = (state: AppState, flagId: string): boolean => state.game.flags[flagId] === true;

const isStepComplete = (step: TaskGuideStepDefinition, state: AppState): boolean => {
  if (step.completionFlag) return hasFlag(state, step.completionFlag);
  if (step.completionKind === 'cave-photo-opened') return state.modules.photos.openedPhotoIds.includes(CAVE_PHOTO_ID);
  if (step.completionKind === 'cave-symbol-visible') {
    const adjustment = state.modules.photos.adjustments[CAVE_PHOTO_ID];
    return adjustment !== undefined && isSymbolVisible(adjustment);
  }
  return false;
};

const isGuideAvailable = (guide: TaskGuideDefinition, state: AppState): boolean => (
  guide.phases.includes(state.game.phase)
  && guide.prerequisiteFlags.every((flagId) => hasFlag(state, flagId))
  && !guide.completionFlags.every((flagId) => hasFlag(state, flagId))
);

/** Returns the first unfinished guide in the frozen first-act desktop sequence. */
export function getCurrentTaskGuide(state: AppState): TaskGuide | null {
  const guide = document.items.find((candidate) => isGuideAvailable(candidate, state));
  if (!guide) return null;

  const completed = guide.steps.map((step) => isStepComplete(step, state));
  const currentIndex = completed.findIndex((complete) => !complete);
  const steps = guide.steps.map((step, index) => ({
    label: step.label,
    complete: completed[index],
    current: index === currentIndex,
    ...(step.appId ? { appId: step.appId } : {}),
  }));
  const actionAppId = guide.steps
    .slice(Math.max(currentIndex, 0))
    .find((step) => step.appId)?.appId;

  return {
    id: guide.id,
    title: '当前待办',
    summary: guide.summary,
    completedCount: completed.filter(Boolean).length,
    totalCount: guide.steps.length,
    steps,
    ...(actionAppId ? { actionAppId, actionLabel: actionLabels[actionAppId] } : {}),
  };
}
