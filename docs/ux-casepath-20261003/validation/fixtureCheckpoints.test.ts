import { describe, expect, it } from 'vitest';
import { hydrateState } from '../../../src/core/saveManager';
import { buildCheckpoint, FIXTURE_MODES } from './fixtureCheckpoints';

describe('whole-App legal fixture checkpoints', () => {
  it('keeps every advertised checkpoint after a save/load hydration cycle', () => {
    const expectedStages: Record<(typeof FIXTURE_MODES)[number], string> = {
      'a1-start': 'inactive', 'a1-f': 'inactive', 'a1-ending': 'inactive',
      bridge: 'bridge', library: 'library', tales: 'tales', school: 'school',
      qiming: 'qiming', 'qiming-zhong': 'qiming', 'qiming-both': 'qiming', 'qiming-legacy': 'qiming',
      finale: 'finale', 'a3-t04': 'finale', 'a4-t05': 'finale',
    };
    for (const mode of FIXTURE_MODES) {
      const state = hydrateState(JSON.parse(JSON.stringify(buildCheckpoint(mode))));
      expect(state.schemaVersion, mode).toBe(13);
      expect(state.modules.act2Research.stage, mode).toBe(expectedStages[mode]);
    }
  });

  it('opens A3 T04 with earlier route evidence intact and the current paper still undiscovered', () => {
    const state = hydrateState(JSON.parse(JSON.stringify(buildCheckpoint('a3-t04'))));
    expect(state.modules.act3.stage).toBe('T04');
    expect(state.game.phase).toBe('A3_T04');
    expect(state.modules.act3.inspectedClueIds).toContain('CLUE_A3_T03_48_72H');
    expect(state.modules.act3.inspectedClueIds).not.toContain('CLUE_A3_T04_VVAKE_PAPER');
    expect(state.modules.act3.confirmedFlagIds).toContain('FLAG_A3_CONFINEMENT_SITE_CONFIRMED');
    expect(state.game.flags.FLAG_A3_VVAKE_PAPER_FOUND).not.toBe(true);
    expect(state.modules.act4.stage).toBe('inactive');
  });

  it('keeps the current Act 2 stage legal while carrying only its prior route facts forward', () => {
    const bridge = hydrateState(JSON.parse(JSON.stringify(buildCheckpoint('bridge'))));
    expect(bridge.modules.act2Research.stage).toBe('bridge');
    expect(bridge.game.flags.FLAG_A2_OFFLINE_RESEARCH_NEEDED).toBe(true);
    expect(bridge.game.flags.FLAG_A2_SEARCH_SS_ATTEMPTED).toBe(true);
    expect(bridge.modules.photos.openedPhotoIds).toEqual(['IMG_A1_I_001', 'IMG_A1_I_002', 'IMG_A1_I_003']);
    expect(bridge.modules.act2Research.bridge.heardPhrase).toBe(false);

    const library = hydrateState(JSON.parse(JSON.stringify(buildCheckpoint('library'))));
    expect(library.modules.act2Research.stage).toBe('library');
    expect(library.game.flags.FLAG_A2_HEIBUMU_NAME_SOLVED).toBe(true);
    expect(library.modules.act2Research.bridge.heardPhrase).toBe(true);
    expect(library.game.flags.FLAG_A2_BUMU_RULE_BASIC_KNOWN).not.toBe(true);

    const tales = hydrateState(JSON.parse(JSON.stringify(buildCheckpoint('tales'))));
    expect(tales.modules.act2Research.stage).toBe('tales');
    expect(tales.game.flags.FLAG_A2_BUMUZHI_FOUND).toBe(true);
    expect(tales.game.flags.FLAG_A2_BUMU_RULE_BASIC_KNOWN).toBe(true);
    expect(tales.modules.notepad.autoEntryIds).toContain('NOTE_A2_T03_001');
    expect(tales.modules.act2Research.tales.readTaleIds).toEqual([]);
    expect(tales.modules.act2Research.tales.inferenceAcknowledged).toBe(false);
    expect(tales.game.flags.FLAG_A2_TRANSFER_RULE_INFERRED).not.toBe(true);
  });

  it('opens A4 T05 from Wang Ao perspective with only sections one through four completed', () => {
    const state = hydrateState(JSON.parse(JSON.stringify(buildCheckpoint('a4-t05'))));
    expect(state.modules.act3.stage).toBe('T07');
    expect(state.game.flags.FLAG_A3_COMPLETE).toBe(true);
    expect(state.modules.act4.stage).toBe('T05');
    expect(state.modules.act4.completedNarrativeSectionIds).toEqual(['A4_READ_T01', 'A4_READ_T02', 'A4_READ_T03', 'A4_READ_T04']);
    expect(state.modules.act4.completedNarrativeActionIds).toEqual(['A4_T02_LOGIN_SUCCEEDED', 'A4_T04_WAKE_MAIL_OPENED']);
    expect(state.game.flags.FLAG_A4_T05_COMPLETE).not.toBe(true);
    expect(state.modules.act4.readNotebookPages).toHaveLength(9);
  });

  it('keeps the T06 reviewer checkpoints explicit and the legacy path separate', () => {
    const zhong = hydrateState(JSON.parse(JSON.stringify(buildCheckpoint('qiming-zhong'))));
    expect(zhong.modules.act2Research.t06.reviewedCases.map(({ caseId }) => caseId)).toEqual(['zhong']);
    expect(zhong.game.flags.FLAG_A2_OTHER_CASES_ABNORMAL).not.toBe(true);

    const both = hydrateState(JSON.parse(JSON.stringify(buildCheckpoint('qiming-both'))));
    expect(both.modules.act2Research.t06.reviewedCases.map(({ caseId }) => caseId)).toEqual(['huang', 'zhong']);
    expect(both.game.flags.FLAG_A2_OTHER_CASES_ABNORMAL).toBe(true);

    const legacy = hydrateState(JSON.parse(JSON.stringify(buildCheckpoint('qiming-legacy'))));
    expect(legacy.modules.act2Research.t06.reviewedCases).toEqual([]);
    expect(legacy.modules.act2Research.t06.legacyCompletionMigrated).toBe(true);
  });
});
