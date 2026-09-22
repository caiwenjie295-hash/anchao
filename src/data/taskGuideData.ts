import taskGuidesDocument from '../../data/task_guides.json';
import flagsDocument from '../../data/flags.json';
import { APP_IDS, type AppId, type AppState } from '../core/types';
import { isSymbolVisible } from './photoData';

type CompletionKind = 'cave-photo-opened' | 'cave-symbol-visible' | 'tales-read';

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
const flags = (flagsDocument as { items: { id: string }[] }).items;

/** 桌面提示不得代替玩家给出第二幕答案。 */
const ACT2_GUIDE_FORBIDDEN_TERMS = ['黑补母', '补母志', '以有余补不足'];
/** T02、T03 只给步骤提示，不伪造桌面 App 入口。 */
const ACT2_HINT_ONLY_GUIDE_IDS = ['GUIDE_A2_T02_001', 'GUIDE_A2_T03_001'];

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
  if (step.completionKind === 'tales-read') return state.modules.act2Research.tales.readTaleIds.length === 3;
  return false;
};

const isGuideAvailable = (guide: TaskGuideDefinition, state: AppState): boolean => (
  guide.phases.includes(state.game.phase)
  && guide.prerequisiteFlags.every((flagId) => hasFlag(state, flagId))
  && !guide.completionFlags.every((flagId) => hasFlag(state, flagId))
);

export function validateTaskGuideData(): void {
  if (document.items.length === 0) throw new Error('桌面任务引导缺少条目。');
  const ids = new Set<string>();
  for (const guide of document.items) {
    if (!guide.id || ids.has(guide.id)) throw new Error(`桌面任务引导 ID 无效：${guide.id}`);
    ids.add(guide.id);
    if (!guide.phases.length || !guide.completionFlags.length || !guide.summary || !guide.steps.length) throw new Error(`桌面任务引导字段无效：${guide.id}`);
    if (!Array.isArray(guide.prerequisiteFlags)) throw new Error(`桌面任务引导前置字段无效：${guide.id}`);
    const referencedFlagIds = [...guide.prerequisiteFlags, ...guide.completionFlags, ...guide.steps.flatMap((step) => (step.completionFlag ? [step.completionFlag] : []))];
    for (const flagId of referencedFlagIds) if (!flags.some((flag) => flag.id === flagId)) throw new Error(`${guide.id} 引用了未登记 Flag：${flagId}`);
    for (const step of guide.steps) {
      if (!step.label) throw new Error(`${guide.id} 缺少步骤文案。`);
      if (step.appId && !APP_IDS.includes(step.appId)) throw new Error(`${guide.id} 引用了未登记应用：${step.appId}`);
    }
    if (guide.id.startsWith('GUIDE_A2_')) {
      const text = [guide.summary, ...guide.steps.map((step) => step.label)].join('\n');
      for (const term of ACT2_GUIDE_FORBIDDEN_TERMS) if (text.includes(term)) throw new Error(`${guide.id} 泄露了第二幕答案：${term}`);
      if (ACT2_HINT_ONLY_GUIDE_IDS.includes(guide.id) && guide.steps.some((step) => step.appId)) throw new Error(`${guide.id} 不得伪造桌面 App 入口。`);
    }
  }
  const act2T01 = document.items.find((guide) => guide.id === 'GUIDE_A2_T01_001');
  if (!act2T01?.steps.some((step) => step.appId === 'browser')) throw new Error('GUIDE_A2_T01_001 必须提供浏览器入口。');
}
validateTaskGuideData();

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
