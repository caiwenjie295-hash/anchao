import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { getCurrentTaskGuide } from './taskGuideData';

const withFlags = (flags: Record<string, boolean>, phase: ReturnType<typeof createDefaultState>['game']['phase'] = 'A') => {
  const state = createDefaultState();
  state.game.phase = phase;
  state.game.flags = flags;
  return state;
};

describe('desktop task guides', () => {
  it('starts with the WeChat guide and preserves its first incomplete step', () => {
    const guide = getCurrentTaskGuide(withFlags({ FLAG_A1_MOM_MSG_TRIGGERED: true }, 'B'));
    expect(guide).toMatchObject({ id: 'GUIDE_A1_001', completedCount: 1, actionAppId: 'wechat' });
    expect(guide?.steps.map((step) => step.current)).toEqual([false, true]);
  });

  it('moves through the mail and browser guides using their ordered conditions', () => {
    expect(getCurrentTaskGuide(withFlags({ FLAG_A1_XIAOA_MISSING_KNOWN: true }, 'C'))?.id).toBe('GUIDE_A1_002');
    const browser = getCurrentTaskGuide(withFlags({
      FLAG_A1_XIAOA_MISSING_KNOWN: true,
      FLAG_A1_MAIL_XIAOA_OPENED: true,
      FLAG_A1_NEWS_FOUND: true,
    }, 'E'));
    expect(browser).toMatchObject({ id: 'GUIDE_A1_003', completedCount: 1, actionAppId: 'browser' });
  });

  it('evaluates the photo guide with the shared visibility threshold', () => {
    const state = withFlags({ FLAG_A1_TEMPLE_PHOTO_TAKEN: true }, 'J');
    state.modules.photos.openedPhotoIds = ['IMG_A1_H_003'];
    state.modules.photos.adjustments.IMG_A1_H_003 = { exposure: 35, shadows: 30, contrast: 20 };
    const guide = getCurrentTaskGuide(state);
    expect(guide).toMatchObject({ id: 'GUIDE_A1_004', completedCount: 2, actionAppId: 'photos' });
    expect(guide?.steps.map((step) => step.complete)).toEqual([true, true, false]);
  });

  it('shows the final collection guide in K and hides after the act is complete', () => {
    const guide = getCurrentTaskGuide(withFlags({ FLAG_A1_SS_FOUND: true, FLAG_A1_SS_CLUE_RECORDED: true }, 'K'));
    expect(guide).toMatchObject({ id: 'GUIDE_A1_005', completedCount: 1, actionAppId: 'photos' });
    expect(getCurrentTaskGuide(withFlags({ FLAG_A1_COMPLETE: true }, 'K'))).toBeNull();
  });

  it('returns null for states outside the frozen guide chain', () => {
    expect(getCurrentTaskGuide(withFlags({}, 'F'))).toBeNull();
  });
});
