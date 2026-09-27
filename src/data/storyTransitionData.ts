import document from '../../data/story_transitions.json';
import type { AppId, AppState, GamePhase } from '../core/types';

export interface StoryTransitionRecord {
  id: string;
  phase: GamePhase;
  trigger: 'phase' | 'journey-finished';
  requiredFlags: string[];
  eyebrow: string;
  title: string;
  paragraphs: string[];
  actionLabel: string;
  presentation?: 'immediate' | 'launch';
  targetAppId?: AppId;
}

export const STORY_PHASE_ORDER: GamePhase[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'A2_T01', 'A2_T02', 'A2_T03', 'A2_T04', 'A2_T05', 'A2_T06', 'A2_T07', 'A3_T00', 'A3_T01', 'A3_T02', 'A3_T03'];
export const storyTransitions = document.items as StoryTransitionRecord[];
export const storyTransitionIds = new Set(storyTransitions.map((item) => item.id));

export function validateStoryTransitions(): void {
  if (document.schemaVersion !== 1 || storyTransitionIds.size !== storyTransitions.length) throw new Error('转场数据版本或 ID 重复。');
  for (const item of storyTransitions) {
    if (!STORY_PHASE_ORDER.includes(item.phase) || !['phase', 'journey-finished'].includes(item.trigger)) throw new Error(`转场阶段无效：${item.id}`);
    if (!item.id || !item.eyebrow || !item.title || !item.actionLabel || item.paragraphs.length === 0 || item.paragraphs.some((text) => !text.trim())) throw new Error(`转场文案不完整：${item.id}`);
    if (item.trigger === 'journey-finished' && item.phase !== 'I') throw new Error(`返程转场阶段无效：${item.id}`);
    if (item.presentation !== undefined && !['immediate', 'launch'].includes(item.presentation)) throw new Error(`转场呈现无效：${item.id}`);
    if (item.targetAppId !== undefined && !['wechat', 'mail', 'browser', 'explorer', 'notepad', 'photos'].includes(item.targetAppId)) throw new Error(`转场应用无效：${item.id}`);
  }
}

/** 只根据真实剧情进度求值，不能从 UI 推进状态。 */
export function isStoryTransitionReached(state: AppState, item: StoryTransitionRecord): boolean {
  const current = STORY_PHASE_ORDER.indexOf(state.game.phase as GamePhase);
  const target = STORY_PHASE_ORDER.indexOf(item.phase);
  if (current < target || current < 0 || !item.requiredFlags.every((flag) => state.game.flags[flag] === true)) return false;
  if (item.id === 'TRANSITION_A1_INTRO') return current > 0 || state.game.phase === 'A';
  if (item.trigger === 'journey-finished') {
    if (current > target) return true;
    return !state.modules.scene.journeyStarted && state.modules.scene.currentSceneId === null
      && ['IMG_A1_H_003', 'IMG_A1_I_004'].every((id) => state.modules.scene.capturedPhotoIds.includes(id));
  }
  return true;
}

export function getPendingStoryTransition(state: AppState): StoryTransitionRecord | null {
  return storyTransitions.find((item) => item.phase === state.game.phase
    && !state.modules.storyTransitions.seenIds.includes(item.id)
    && isStoryTransitionReached(state, item)) ?? null;
}
