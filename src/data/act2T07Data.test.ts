import { describe, expect, it } from 'vitest';
import flagsDocument from '../../data/flags.json';
import notesDocument from '../../data/notes.json';
import { ACT2_T07_FRAME_IDS, ACT2_T07_MATERIAL_IDS, ACT2_T07_SEGMENT_IDS, act2T07, act2T06RecapPages, formatClock, isFrameCapturableAt, keyFrameAt, keyFrameById, segmentAt, validateAct2T07Data } from './act2T07Data';

const flags = (flagsDocument as { items: { id: string; defaultValue: boolean }[] }).items;
const notes = (notesDocument as { items: { id: string }[] }).items;

describe('T07 promotion data', () => {
  it('keeps frozen IDs, schema and registrations valid', () => {
    expect(() => validateAct2T07Data()).not.toThrow();
    expect(act2T07.schemaVersion).toBe(1);
    expect(act2T07.record.phase).toBe('A2_T07');
    for (const flagId of ['FLAG_A2_PROMO_VIDEO_FOUND', 'FLAG_A2_PROMO_VIDEO_WATCHED', 'FLAG_A2_PROMO_PHOTO_SS_FOUND', 'FLAG_A2_TEMPLE_FRAME_FOUND', 'FLAG_A2_QIMING_LOCATION_INFERRED', 'FLAG_A2_SECOND_TRIP_PLANNED', 'FLAG_A2_COMPLETE']) {
      expect(flags.some((flag) => flag.id === flagId && flag.defaultValue === false)).toBe(true);
    }
    for (const noteId of ['NOTE_A2_T07_001', 'NOTE_A2_T07_002', 'NOTE_A2_T07_003', 'NOTE_A2_T07_004']) expect(notes.some((note) => note.id === noteId)).toBe(true);
    // 旧拟名不得出现在 T07 数据中。
    expect(JSON.stringify(act2T07).includes('FLAG_A2_VIDEO_SS_FOUND')).toBe(false);
  });

  it('places the double S in the group photo corner and the temple in the video', () => {
    const photo = act2T07.materials.find((material) => material.id === act2T07.photoMaterialId)!;
    expect(photo.xiaoyueLine).toContain('右下角');
    expect(JSON.stringify(act2T07.materials)).toContain('双 S');
    const frame = keyFrameById.get('FRAME_A2_T07_001')!;
    expect(frame.segmentId).toBe('SEG_A2_T07_003');
    expect(act2T07.comparison.exteriorImageId).toBe('IMG_A1_I_001');
    expect(JSON.stringify(act2T07.comparison)).not.toContain('IMG_A1_I_004');
  });

  it('derives playback position, capture windows and clock text from data only', () => {
    expect(ACT2_T07_MATERIAL_IDS).toEqual(['MATERIAL_A2_T07_PHOTO', 'MATERIAL_A2_T07_VIDEO']);
    expect(ACT2_T07_SEGMENT_IDS).toHaveLength(4);
    expect(ACT2_T07_FRAME_IDS).toEqual(['FRAME_A2_T07_001']);
    expect(segmentAt(0)?.id).toBe('SEG_A2_T07_001');
    expect(segmentAt(7000)?.id).toBe('SEG_A2_T07_003');
    expect(keyFrameAt(10000)).toBeUndefined();
    expect(keyFrameAt(7000)?.id).toBe('FRAME_A2_T07_001');
    expect(isFrameCapturableAt('FRAME_A2_T07_001', 7000)).toBe(true);
    expect(isFrameCapturableAt('FRAME_A2_T07_001', 10000)).toBe(false);
    expect(isFrameCapturableAt('FRAME_A2_T07_002', 7000)).toBe(false);
    expect(formatClock(7000)).toBe('00:07');
    // 关键画面短暂但容错，窗口不窄于 1 秒。
    const frame = keyFrameById.get('FRAME_A2_T07_001')!;
    expect(frame.endMs - frame.startMs).toBeGreaterThanOrEqual(1000);
  });

  it('reuses existing T06 pages as read-only recap without new progress', () => {
    expect(act2T06RecapPages.length).toBeGreaterThan(0);
    for (const page of act2T06RecapPages) expect(page.id.startsWith('PAGE_A2_T06_')).toBe(true);
  });
});
