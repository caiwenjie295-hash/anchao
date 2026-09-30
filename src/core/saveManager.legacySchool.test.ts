import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { hydrateState } from '../core/saveManager';
import type { AppState } from '../core/types';

/**
 * 审查 `docs/reviews/Bunny_1-2026-09-30.md` [P1] 要求的回归覆盖。
 *
 * 旧 schema 存档的完成事实在首次迁移时被放行，但若不持久化，
 * 保存后的第二次载入会按新门槛把它清掉，进而回退 qiming/finale 与第三幕入口。
 */
const legacySchoolCompletion = (): AppState => {
  const legacy = createDefaultState();
  (legacy as { schemaVersion: number }).schemaVersion = 9;
  legacy.game.act = 2;
  legacy.game.phase = 'A2_T05';
  legacy.game.flags = {
    FLAG_A1_COMPLETE: true,
    FLAG_A1_SS_FOUND: true,
    FLAG_A2_TRANSFER_RULE_INFERRED: true,
    FLAG_A2_SCHOOL_ENTERED: true,
    FLAG_A2_FIRE_HYDRANT_SEEN: true,
    FLAG_A2_LEAVE_OF_ABSENCE_KNOWN: true,
    FLAG_A2_SCORE_CHANGE_KNOWN: true,
    FLAG_A2_QIMING_NAME_FOUND: true,
    FLAG_A2_SCHOOL_SS_FOUND: true,
    FLAG_A2_SS_MATCH_CONFIRMED: true,
  };
  legacy.modules.act2Research.stage = 'school';
  legacy.modules.act2Research.school.visitedAreaIds = ['AREA_A2_T05_CORRIDOR', 'AREA_A2_T05_HONOR_ROLL', 'AREA_A2_T05_TEACHER_OFFICE', 'AREA_A2_T05_XIAOA_CLASSROOM'];
  legacy.modules.act2Research.school.inspectedHotspotIds = ['HOTSPOT_A2_T05_TEACHER', 'HOTSPOT_A2_T05_RANKS', 'HOTSPOT_A2_T05_QIMING_TEXT', 'HOTSPOT_A2_T05_SCHOLAR_NOTE'];
  legacy.modules.notepad.autoEntryIds = ['NOTE_A2_T05_004'];
  return legacy;
};

/** 模拟一次真实的“序列化 → 载入”往返。 */
const roundTrip = (state: AppState) => hydrateState(JSON.parse(JSON.stringify(state)));

describe('legacy school completion survives repeated reloads', () => {
  it('keeps the verified schema 9 school completion after a save and a second reload', () => {
    const once = roundTrip(legacySchoolCompletion());
    expect(once.schemaVersion).toBe(10);
    expect(once.game.flags.FLAG_A2_SS_MATCH_CONFIRMED).toBe(true);

    const twice = roundTrip(once);
    expect(twice.game.flags.FLAG_A2_SS_MATCH_CONFIRMED).toBe(true);
    expect(twice.modules.notepad.autoEntryIds).toContain('NOTE_A2_T05_004');
  });

  it('stays stable across at least two further reloads', () => {
    let state = roundTrip(legacySchoolCompletion());
    for (let round = 0; round < 2; round += 1) {
      state = roundTrip(state);
      expect(state.schemaVersion).toBe(10);
      expect(state.game.flags.FLAG_A2_SS_MATCH_CONFIRMED).toBe(true);
    }
  });

  it('records the migration fact without inventing new evidence choices', () => {
    const migrated = roundTrip(legacySchoolCompletion());
    expect(migrated.modules.act2Research.school.legacyCompletionMigrated).toBe(true);
    // 不得为旧存档补写 schema 10 才引入的证据选择。
    expect(migrated.modules.act2Research.school.selectedEvidenceIds).toEqual([]);
    expect(migrated.modules.act2Research.school.selectedInferenceId).toBeNull();
    expect(migrated.modules.act2Research.school.symbolMatchConfirmed).toBe(false);
  });

  it('does not upgrade an incomplete legacy save into a completed one', () => {
    const incomplete = legacySchoolCompletion();
    delete incomplete.game.flags.FLAG_A2_SS_MATCH_CONFIRMED;
    const once = roundTrip(incomplete);
    expect(once.game.flags.FLAG_A2_SS_MATCH_CONFIRMED).toBeUndefined();
    expect(once.modules.act2Research.school.legacyCompletionMigrated).toBe(false);
    const twice = roundTrip(once);
    expect(twice.game.flags.FLAG_A2_SS_MATCH_CONFIRMED).toBeUndefined();
  });

  it('rejects a legacy completion flag whose supporting evidence is missing', () => {
    const forged = legacySchoolCompletion();
    // 保留完成 Flag，但抽掉支撑证据：不得被迁移标记放行。
    forged.modules.act2Research.school.inspectedHotspotIds = ['HOTSPOT_A2_T05_TEACHER'];
    const migrated = roundTrip(forged);
    expect(migrated.game.flags.FLAG_A2_SS_MATCH_CONFIRMED).toBeUndefined();
    expect(migrated.modules.act2Research.school.legacyCompletionMigrated).toBe(false);
  });

  it('rejects a legacy completion flag without the first-act double S discovery', () => {
    const forged = legacySchoolCompletion();
    forged.game.flags.FLAG_A1_SS_FOUND = false;
    const migrated = roundTrip(forged);
    expect(migrated.game.flags.FLAG_A2_SS_MATCH_CONFIRMED).toBeUndefined();
    expect(migrated.modules.act2Research.school.legacyCompletionMigrated).toBe(false);
  });

  it('keeps downstream second-act progress reachable from the migrated save', () => {
    const migrated = roundTrip(legacySchoolCompletion());
    expect(migrated.modules.act2Research.stage).toBe('school');
    // 第二次载入后仍允许继续推进到 qiming，而不被回退到 tales。
    const advanced = migrated;
    advanced.modules.act2Research.stage = 'qiming';
    const reloaded = roundTrip(advanced);
    expect(reloaded.modules.act2Research.stage).toBe('qiming');
    expect(reloaded.game.flags.FLAG_A2_SS_MATCH_CONFIRMED).toBe(true);
  });
});
