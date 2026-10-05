import { describe, expect, it } from 'vitest';
import { act4ReadingSpaceKey, sanitizeAct4ReadingPosition } from './readingPosition';

describe('A4 independent reading position', () => {
  it('uses a separate space for chapter review and the main reading path', () => {
    expect(act4ReadingSpaceKey('T05', 'current')).toBe('T05:current');
    expect(act4ReadingSpaceKey('T04', 'review')).toBe('T04:review');
    expect(act4ReadingSpaceKey('inactive', 'current')).toBeNull();
  });

  it('clamps page positions and drops hidden blocks and unrecognized covers', () => {
    const position = sanitizeAct4ReadingPosition({
      activeBlockId: 'HIDDEN_FUTURE',
      pageIndexByBlock: { T05_ORIGINAL: 99, T05_MAIL: -1, HIDDEN_FUTURE: 3 },
      openedCoverKeys: ['cover-current', 'cover-hidden'],
    }, [
      { blockId: 'T05_ORIGINAL', pageCount: 4, coverKeys: ['cover-current'] },
      { blockId: 'T05_MAIL', pageCount: 1, coverKeys: [] },
    ]);
    expect(position).toEqual({ activeBlockId: 'T05_ORIGINAL', pageIndexByBlock: { T05_ORIGINAL: 3, T05_MAIL: 0 }, openedCoverKeys: ['cover-current'] });
  });

  it('falls back to the first available block when the stored target is missing', () => {
    expect(sanitizeAct4ReadingPosition({ activeBlockId: 'gone', pageIndexByBlock: {}, openedCoverKeys: [] }, [
      { blockId: 'visible', pageCount: 2, coverKeys: [] },
    ]).activeBlockId).toBe('visible');
  });
});
