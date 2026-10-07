import { describe, expect, it } from 'vitest';
import { OPENING_PRELUDE, shouldShowOpeningPrelude } from './openingPreludeData';

describe('opening prelude display policy', () => {
  it('shows the independent prelude for a fresh or storage-unavailable session', () => {
    expect(shouldShowOpeningPrelude('empty')).toBe(true);
    expect(shouldShowOpeningPrelude('unavailable')).toBe(true);
  });

  it('does not add another opening to a loaded, imported, or recovery save', () => {
    expect(shouldShowOpeningPrelude('loaded')).toBe(false);
    expect(shouldShowOpeningPrelude('corrupt')).toBe(false);
    expect(shouldShowOpeningPrelude('unsupported-version')).toBe(false);
  });

  it('keeps the new text and duration separate from the authored transition record', () => {
    expect(OPENING_PRELUDE).toMatchObject({
      id: 'TRANSITION_A1_INTRO',
      paragraphs: [
        '多年后，我才知道他失踪了。',
        '像是蒸发了一样。',
        '我甚至开始怀疑，自己的记忆是否出了问题。',
        '我要找到他。',
      ],
      playTime: '游玩时间约 20–35 分钟',
      actionLabel: '开始调查',
    });
  });
});
