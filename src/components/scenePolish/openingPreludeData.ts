import type { SaveReadResult } from '../../core/saveManager';

export const OPENING_PRELUDE = {
  id: 'TRANSITION_A1_INTRO',
  paragraphs: [
    '多年后，我才知道他失踪了。',
    '像是蒸发了一样。',
    '我甚至开始怀疑，自己的记忆是否出了问题。',
    '我要找到他。',
  ],
  playTime: '游玩时间约 20–35 分钟',
  actionLabel: '开始调查',
} as const;

/** New installations and unavailable browser storage get the new prelude; saved or imported progress keeps its existing entry. */
export function shouldShowOpeningPrelude(saveResult: SaveReadResult['kind']): boolean {
  return saveResult === 'empty' || saveResult === 'unavailable';
}
