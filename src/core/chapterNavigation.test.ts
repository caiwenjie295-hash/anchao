import { describe, expect, it } from 'vitest';
import { createDefaultState } from './defaultState';
import { buildLegacyChapterEntry, deriveReachedChapter, getChapterChoices, readChapterEntrySnapshot } from './chapterNavigation';
import { emptyChapterHistory, recordChapterEntry } from './persistence/chapterHistory';

describe('chapter navigation model', () => {
  it('derives access from the actual act and active stages, never from a prior-completion flag alone', () => {
    const state = createDefaultState();
    state.game.flags.FLAG_A2_COMPLETE = true;
    state.game.flags.FLAG_A3_COMPLETE = true;
    expect(deriveReachedChapter(state)).toBe(1);
    state.modules.act2Research.stage = 'finale';
    expect(deriveReachedChapter(state)).toBe(2);
    state.modules.act3.stage = 'T00';
    expect(deriveReachedChapter(state)).toBe(3);
    state.modules.act4.stage = 'T01';
    expect(deriveReachedChapter(state)).toBe(4);
  });

  it('retains later access in the sidecar while the current save is at chapter one', () => {
    const history = { ...emptyChapterHistory(), unlockedThrough: 4 as const };
    const choices = getChapterChoices(createDefaultState(), history);
    expect(choices.map(({ unlocked }) => unlocked)).toEqual([true, true, true, true]);
  });

  it('builds safe old-save entry snapshots from real prior-act material without carrying later flags', () => {
    const current = createDefaultState();
    current.game.act = 4;
    current.game.phase = 'A4_T10';
    current.game.flags = {
      FLAG_A1_COMPLETE: true,
      FLAG_A1_SS_FOUND: true,
      FLAG_A2_COMPLETE: true,
      FLAG_A2_PROMO_VIDEO_FOUND: true,
      FLAG_A3_COMPLETE: true,
      FLAG_A3_SITE_EXITED: true,
      FLAG_A4_COMPLETE: true,
    };
    current.modules.act2Research.stage = 'finale';
    current.modules.act2Research.t07.viewedMaterialIds = ['MATERIAL_A2_T07_PROMO_VIDEO'];
    current.modules.act3.stage = 'T07';
    current.modules.act3.inspectedClueIds = ['CLUE_A3_T07_NOTEBOOK_PICKUP'];
    current.modules.act4.stage = 'T10';
    current.modules.act4.finalMailOpened = true;
    current.modules.notepad.userText = 'later private notes';
    current.modules.notepad.autoEntryIds = ['NOTE_A1_E_001', 'NOTE_A2_T07_001', 'NOTE_A3_T07_001', 'NOTE_A4_T10_001'];

    const act2 = buildLegacyChapterEntry(current, 2)!;
    expect(act2).toMatchObject({ game: { act: 2, phase: 'A2_T01', flags: { FLAG_A1_COMPLETE: true } }, modules: { act2Research: { stage: 'search' } } });
    expect(act2.game.flags).not.toHaveProperty('FLAG_A2_COMPLETE');
    expect(act2.modules.notepad).toEqual({ userText: '', autoEntryIds: ['NOTE_A1_E_001'] });
    const act3 = buildLegacyChapterEntry(current, 3)!;
    expect(act3).toMatchObject({ game: { act: 3, phase: 'A3_T00', flags: { FLAG_A2_COMPLETE: true } }, modules: { act2Research: { stage: 'finale' }, act3: { stage: 'T00' } } });
    expect(act3.game.flags).not.toHaveProperty('FLAG_A3_COMPLETE');
    expect(act3.modules.notepad.autoEntryIds).toEqual(['NOTE_A1_E_001', 'NOTE_A2_T07_001']);
    const act4 = buildLegacyChapterEntry(current, 4)!;
    expect(act4).toMatchObject({ game: { act: 4, phase: 'A4_T01', flags: { FLAG_A3_COMPLETE: true } }, modules: { act3: { stage: 'T07' }, act4: { stage: 'T01' } } });
    expect(act4.modules.act4.finalMailOpened).toBe(false);
  });

  it('validates snapshots against the requested chapter start and ignores malformed sidecar text', () => {
    const state = createDefaultState();
    expect(readChapterEntrySnapshot('{broken', 1)).toBeNull();
    expect(readChapterEntrySnapshot(JSON.stringify(state), 2)).toBeNull();
    const act2 = createDefaultState();
    act2.game.act = 2;
    act2.game.phase = 'A2_T01';
    act2.game.flags.FLAG_A1_COMPLETE = true;
    act2.modules.act2Research.stage = 'search';
    expect(readChapterEntrySnapshot(JSON.stringify(act2), 2)).toMatchObject({ game: { act: 2, phase: 'A2_T01' } });
  });

  it('records the real chapter entry but does not overwrite an earlier snapshot', () => {
    const first = createDefaultState();
    first.game.act = 2;
    first.game.phase = 'A2_T01';
    first.modules.act2Research.stage = 'search';
    first.game.flags.FLAG_A1_COMPLETE = true;
    const firstHistory = recordChapterEntry(emptyChapterHistory(), 2, first);
    const later = { ...first, game: { ...first.game, phase: 'A2_T02' as const } };
    const secondHistory = recordChapterEntry(firstHistory, 2, later);
    expect(secondHistory.snapshots[2]).toBe(JSON.stringify(first));
  });
});
