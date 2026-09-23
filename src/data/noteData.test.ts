import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { ACT2_NOTE_IDS, getAutoEntries, noteById, validateNoteData } from './noteData';

describe('note data', () => {
  it('validates entries and preserves the frozen weak prompt', () => expect(() => validateNoteData()).not.toThrow());
  it('returns automatic entries by persisted id without duplicating content', () => {
    const state = createDefaultState().modules.notepad;
    state.autoEntryIds = ['NOTE_A1_E_001', 'NOTE_A1_E_001', 'unknown'];
    expect(getAutoEntries(state).map((entry) => entry.id)).toEqual(['NOTE_A1_E_001']);
  });
});

describe('act2 note registry', () => {
  it('registers the notes consumed by T01-T06 tasks', () => {
    for (const noteId of ACT2_NOTE_IDS) expect(noteById.get(noteId)?.content).toBeTruthy();
    expect(noteById.get('NOTE_A2_T01_001')?.content).toContain('只有当地人才知道');
    expect(noteById.get('NOTE_A2_T01_002')?.content).toBe('这个词太普通了。');
    expect(noteById.get('NOTE_A2_T02_001')?.content).toContain('hei bu mu');
    expect(noteById.get('NOTE_A2_T02_002')?.content).toContain('县志');
    expect(noteById.get('NOTE_A2_T06_002')?.content).toContain('独立核实');
  });

  it('gates the weak prompt on the first-act completion only', () => {
    // 控制器在 T01 打开 15 秒后加入该笔记，玩家此时可能一次都没有搜索，
    // 因此前置条件只能是“第一幕已完成”。
    const weakPrompt = noteById.get('NOTE_A2_T01_002');
    expect(weakPrompt?.unlockCondition).toEqual(['FLAG_A1_COMPLETE']);
    expect(weakPrompt?.content).toBe('这个词太普通了。');
    expect(weakPrompt?.triggerFlags).toEqual([]);
  });

  it('does not reveal the act-four conclusion in the gazette excerpt', () => {
    const excerpt = noteById.get('NOTE_A2_T03_001')?.content ?? '';
    expect(excerpt).toContain('以有余补不足');
    expect(excerpt).not.toMatch(/记忆|身份/);
  });
});
