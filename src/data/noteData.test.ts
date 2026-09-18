import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { getAutoEntries, validateNoteData } from './noteData';

describe('note data', () => {
  it('validates entries and preserves the frozen weak prompt', () => expect(() => validateNoteData()).not.toThrow());
  it('returns automatic entries by persisted id without duplicating content', () => {
    const state = createDefaultState().modules.notepad;
    state.autoEntryIds = ['NOTE_A1_E_001', 'NOTE_A1_E_001', 'unknown'];
    expect(getAutoEntries(state).map((entry) => entry.id)).toEqual(['NOTE_A1_E_001']);
  });
});
