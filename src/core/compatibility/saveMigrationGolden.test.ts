import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../defaultState';
import { hydrateState } from './saveMigration';

const FROZEN_F9_SCHEMA_9_NORMALIZED_STATE_SHA256 = 'ebaab26f996d7d447b4396ab21468cd5195a11c1e13f0afdcd00c876ccc27c58';

/** Mirrors the existing verified schema-9 school-completion fixture. */
const legacySchoolCompletion = () => {
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

describe('frozen legacy save migration', () => {
  it('matches the f9e6574 schema-9 normalized-state golden hash', async () => {
    const legacy = JSON.parse(JSON.stringify(legacySchoolCompletion()));
    const normalized = hydrateState(legacy);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(normalized)));
    const actualHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');

    expect(normalized.schemaVersion).toBe(13);
    expect(actualHash).toBe(FROZEN_F9_SCHEMA_9_NORMALIZED_STATE_SHA256);
  });
});
