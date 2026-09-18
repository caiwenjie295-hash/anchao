import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { getCurrentTaskGuide, validateTaskGuideData } from './taskGuideData';

type State = ReturnType<typeof createDefaultState>;

const withFlags = (flags: Record<string, boolean>, phase: State['game']['phase'] = 'A') => {
  const state = createDefaultState();
  state.game.phase = phase;
  state.game.flags = flags;
  return state;
};

const act2State = (flags: Record<string, boolean>, phase: State['game']['phase'] = 'A2_T01', stage: State['modules']['act2Research']['stage'] = 'search') => {
  const state = withFlags(flags, phase);
  state.game.act = 2;
  state.modules.act2Research.stage = stage;
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

describe('act2 desktop task guides', () => {
  it('validates the frozen guide chain and keeps it answer-free', () => {
    expect(() => validateTaskGuideData()).not.toThrow();
  });

  it('points T01 at the browser and tracks both searches', () => {
    const guide = getCurrentTaskGuide(act2State({ FLAG_A1_COMPLETE: true }));
    expect(guide).toMatchObject({ id: 'GUIDE_A2_T01_001', actionAppId: 'browser', totalCount: 3 });
    const afterOne = getCurrentTaskGuide(act2State({ FLAG_A1_COMPLETE: true, FLAG_A2_SEARCH_BU_ATTEMPTED: true }));
    expect(afterOne).toMatchObject({ completedCount: 1, actionAppId: 'browser' });
    expect(getCurrentTaskGuide(act2State({ FLAG_A1_COMPLETE: true, FLAG_A2_WEB_SEARCH_FAILED: true }))).toBeNull();
  });

  it('gives T02 and T03 step hints without inventing a desktop app', () => {
    const bridge = getCurrentTaskGuide(act2State({ FLAG_A1_COMPLETE: true, FLAG_A2_WEB_SEARCH_FAILED: true, FLAG_A2_OFFLINE_RESEARCH_NEEDED: true }, 'A2_T02', 'bridge'));
    expect(bridge?.id).toBe('GUIDE_A2_T02_001');
    expect(bridge?.actionAppId).toBeUndefined();
    expect(bridge?.actionLabel).toBeUndefined();
    expect(bridge?.steps.every((step) => step.appId === undefined)).toBe(true);

    const library = getCurrentTaskGuide(act2State({ FLAG_A1_COMPLETE: true, FLAG_A2_WEB_SEARCH_FAILED: true, FLAG_A2_OFFLINE_RESEARCH_NEEDED: true, FLAG_A2_COUNTY_RECORD_HINT_KNOWN: true }, 'A2_T03', 'library'));
    expect(library?.id).toBe('GUIDE_A2_T03_001');
    expect(library?.actionAppId).toBeUndefined();
    expect(library?.steps.every((step) => step.appId === undefined)).toBe(true);
  });

  it('keeps T02 visible until the county-record hint is written', () => {
    const solved = act2State({
      FLAG_A1_COMPLETE: true,
      FLAG_A2_WEB_SEARCH_FAILED: true,
      FLAG_A2_OFFLINE_RESEARCH_NEEDED: true,
      FLAG_A2_ELDER_PHOTO_SHOWN: true,
      FLAG_A2_HEIBUMU_AUDIO_HEARD: true,
      FLAG_A2_HEIBUMU_NAME_SOLVED: true,
    }, 'A2_T02', 'bridge');
    const guide = getCurrentTaskGuide(solved);
    expect(guide).toMatchObject({ id: 'GUIDE_A2_T02_001', completedCount: 3, totalCount: 4 });
    expect(guide?.steps.map((step) => step.complete)).toEqual([true, true, true, false]);
    expect(guide?.steps.map((step) => step.current)).toEqual([false, false, false, true]);

    solved.game.flags.FLAG_A2_COUNTY_RECORD_HINT_KNOWN = true;
    expect(getCurrentTaskGuide(solved)).toBeNull();
  });

  it('completes the T03 steps in order as the library flags arrive', () => {
    const base = {
      FLAG_A1_COMPLETE: true,
      FLAG_A2_WEB_SEARCH_FAILED: true,
      FLAG_A2_OFFLINE_RESEARCH_NEEDED: true,
      FLAG_A2_COUNTY_RECORD_HINT_KNOWN: true,
    };
    const entered = getCurrentTaskGuide(act2State({ ...base, FLAG_A2_LIBRARY_ENTERED: true }, 'A2_T03', 'library'));
    expect(entered).toMatchObject({ id: 'GUIDE_A2_T03_001', completedCount: 1 });
    expect(entered?.steps.map((step) => step.complete)).toEqual([true, false, false, false]);
    expect(entered?.steps.map((step) => step.current)).toEqual([false, true, false, false]);
    expect(entered?.steps[0].label).toBe('进入县图书馆的地方志阅览室');

    const volume = getCurrentTaskGuide(act2State({ ...base, FLAG_A2_LIBRARY_ENTERED: true, FLAG_A2_LOCAL_GAZETTE_FOUND: true }, 'A2_T03', 'library'));
    expect(volume?.steps.map((step) => step.complete)).toEqual([true, true, false, false]);
    expect(volume?.steps.map((step) => step.current)).toEqual([false, false, true, false]);
    expect(volume?.steps[1].label).toBe('在目录里缩小范围，找到相关卷册');

    const done = getCurrentTaskGuide(act2State({
      ...base,
      FLAG_A2_LIBRARY_ENTERED: true,
      FLAG_A2_LOCAL_GAZETTE_FOUND: true,
      FLAG_A2_BUMUZHI_FOUND: true,
      FLAG_A2_BUMU_RULE_BASIC_KNOWN: true,
    }, 'A2_T03', 'library'));
    expect(done).toBeNull();
  });

  it('never spells the answer in act-two guide text', () => {
    const states = [
      act2State({ FLAG_A1_COMPLETE: true }, 'A2_T01', 'search'),
      act2State({
        FLAG_A1_COMPLETE: true,
        FLAG_A2_WEB_SEARCH_FAILED: true,
        FLAG_A2_OFFLINE_RESEARCH_NEEDED: true,
        FLAG_A2_ELDER_PHOTO_SHOWN: true,
        FLAG_A2_HEIBUMU_AUDIO_HEARD: true,
        FLAG_A2_HEIBUMU_NAME_SOLVED: true,
      }, 'A2_T02', 'bridge'),
      act2State({
        FLAG_A1_COMPLETE: true,
        FLAG_A2_WEB_SEARCH_FAILED: true,
        FLAG_A2_OFFLINE_RESEARCH_NEEDED: true,
        FLAG_A2_COUNTY_RECORD_HINT_KNOWN: true,
        FLAG_A2_LIBRARY_ENTERED: true,
      }, 'A2_T03', 'library'),
    ];
    for (const state of states) {
      const guide = getCurrentTaskGuide(state);
      expect(guide).not.toBeNull();
      expect(`${guide?.summary ?? ''}${guide?.steps.map((step) => step.label).join('')}`).not.toMatch(/黑补母|补母志|以有余补不足/);
    }
  });
});
