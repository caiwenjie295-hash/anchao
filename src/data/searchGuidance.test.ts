import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { getSearchGuidance } from './searchGuidance';

describe('stage-aware search guidance', () => {
  it('shows one direct first-act query at a time', () => {
    const state = createDefaultState();
    state.game.phase = 'C';
    state.game.flags.FLAG_A1_MAIL_XIAOA_OPENED = true;
    expect(getSearchGuidance(state)).toEqual([{ query: 'XX县失踪', prompt: '先搜索“XX县失踪”，打开并阅读一篇旧报道。' }]);
    state.game.flags.FLAG_A1_NEWS_FOUND = true;
    expect(getSearchGuidance(state)).toEqual([{ query: '鸡公岭徒步', prompt: '接着搜索“鸡公岭徒步”，打开路线资料核对长度和难度。' }]);
    state.game.flags.FLAG_A1_ROUTE_INFO_FOUND = true;
    expect(getSearchGuidance(state)).toEqual([]);
  });

  it('shows only T01 queries supported by first-act discoveries', () => {
    const state = createDefaultState();
    state.game.act = 2;
    state.game.phase = 'A2_T01';
    state.game.flags.FLAG_A1_COMPLETE = true;
    state.modules.act2Research.stage = 'search';
    expect(getSearchGuidance(state).map(({ query }) => query)).toEqual(['鸡公岭 补']);
    state.game.flags.FLAG_A1_SS_FOUND = true;
    expect(getSearchGuidance(state).map(({ query }) => query)).toEqual(['鸡公岭 补', '双S 十字']);
    expect(getSearchGuidance(state).join(' ')).not.toContain('黑补母');
  });

  it('gates the institution and person searches by the legal T06 stage and known case names', () => {
    const state = createDefaultState();
    state.game.act = 2;
    state.game.phase = 'A2_T06';
    state.game.flags.FLAG_A2_SS_MATCH_CONFIRMED = true;
    state.modules.act2Research.stage = 'qiming';
    expect(getSearchGuidance(state).map(({ query }) => query)).toEqual(['启明青少年成长中心']);
    state.game.flags.FLAG_A2_QIMING_TESTIMONIALS_READ = true;
    expect(getSearchGuidance(state).map(({ query }) => query)).toEqual(['启明青少年成长中心', '启明 黄子山', '启明 钟子月']);
    state.game.flags.FLAG_A2_SS_MATCH_CONFIRMED = false;
    expect(getSearchGuidance(state)).toEqual([]);
  });

  it('does not modify story flags or browser state while deriving prompts', () => {
    const state = createDefaultState();
    state.game.act = 2;
    state.game.flags.FLAG_A1_COMPLETE = true;
    state.modules.act2Research.stage = 'search';
    const before = JSON.stringify(state);
    getSearchGuidance(state);
    expect(JSON.stringify(state)).toBe(before);
  });
});
