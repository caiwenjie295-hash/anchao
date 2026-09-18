import { describe, expect, it } from 'vitest';
import { ACT2_EVIDENCE_ASSET_IDS } from '../core/types';
import {
  act2BridgeData,
  bridgeAudio,
  bridgeClueElder,
  bridgeElders,
  bridgeEvidence,
  bridgeFlagIds,
  bridgeNoteIds,
  bridgePuzzle,
  bridgeResolution,
  bridgeScene,
  validateBridgeData,
} from './act2BridgeData';

describe('act2 bridge data', () => {
  it('passes the frozen contract validation', () => {
    expect(() => validateBridgeData()).not.toThrow();
    expect(act2BridgeData.schemaVersion).toBe(1);
    expect(act2BridgeData.trace.taskId).toBe('WB-0003');
  });

  it('keeps elder ids unique with the frozen prefix and exactly one clue elder', () => {
    expect(bridgeElders.length).toBeGreaterThanOrEqual(4);
    const ids = bridgeElders.map((elder) => elder.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.startsWith('ELDER_A2_T02_')).toBe(true);
    expect(bridgeElders.filter((elder) => elder.isClueElder)).toHaveLength(1);
    expect(bridgeClueElder.evidenceLead).toBeTruthy();
    expect(bridgeClueElder.phrase).toBeTruthy();
  });

  it('restricts evidence to the three frozen act1 asset ids with neutral captions', () => {
    expect(bridgeEvidence.map((item) => item.assetId)).toEqual([...ACT2_EVIDENCE_ASSET_IDS]);
    for (const item of bridgeEvidence) {
      expect(item.name).not.toBe('');
      expect(item.description).not.toBe('');
      expect(item.name).not.toContain('黑补母');
    }
  });

  it('covers the required life-noise topics in elder small talk', () => {
    const smallTalk = bridgeElders.flatMap((elder) => [...elder.chat, ...elder.mountainReply]).join('\n');
    for (const topic of ['山路', '徒步', '旧闻', '邪祟', '吃什么']) {
      expect(smallTalk).toContain(topic);
    }
    for (const elder of bridgeElders) {
      expect(elder.chat.length).toBeGreaterThan(0);
      expect(elder.mountainReply.length).toBeGreaterThan(0);
    }
  });

  it('keeps the oral phrase uncorrected and marks the audio placeholder id', () => {
    expect(bridgeAudio.audioId).toBe('AUDIO_A2_T02_001');
    expect(bridgeAudio.phrase).toBe('黑捕木。');
    expect(bridgeAudio.replayLabel).toContain('重听口述');
  });

  it('freezes the three-part homophone options and the correct answer', () => {
    expect(bridgePuzzle.parts.map((part) => part.options)).toEqual([
      ['黑', '嘿'],
      ['捕', '补', '埔'],
      ['木', '母', '墓'],
    ]);
    expect(bridgePuzzle.correct).toEqual({ first: '黑', middle: '补', last: '母' });
    expect(bridgePuzzle.maxAttempts).toBe(3);
    expect(bridgePuzzle.lockPart).toBe('middle');
    expect(bridgePuzzle.lockValue).toBe('补');
    expect(bridgePuzzle.lockedHint).not.toBe('');
  });

  it('resolves into the formal entry with county-record hint flags and note ids', () => {
    expect(bridgeResolution.entryTitle).toBe('黑补母');
    expect(bridgeResolution.elderRemark).toContain('县志');
    expect(bridgeResolution.flagId).toBe('FLAG_A2_COUNTY_RECORD_HINT_KNOWN');
    expect(bridgeResolution.noteId).toBe('NOTE_A2_T02_002');
    expect(bridgeResolution.continueLabel).toContain('县图书馆');
    expect(bridgeResolution.nextStage).toBe('library');
    expect(bridgeFlagIds).toEqual({
      evidenceShown: 'FLAG_A2_ELDER_PHOTO_SHOWN',
      audioHeard: 'FLAG_A2_HEIBUMU_AUDIO_HEARD',
    });
    expect(bridgeNoteIds).toEqual({ phraseHeard: 'NOTE_A2_T02_001' });
  });

  it('never leaks the solved name or later-stage content before resolution', () => {
    const preSolution = JSON.stringify({ scene: bridgeScene, evidence: bridgeEvidence, elders: bridgeElders, audio: bridgeAudio, puzzle: bridgePuzzle });
    expect(preSolution).not.toContain('黑补母');
    expect(preSolution).not.toContain('补母志');
    expect(preSolution).not.toContain('地方志');
  });
});
