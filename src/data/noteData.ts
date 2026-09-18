import notesDocument from '../../data/notes.json';
import flagsDocument from '../../data/flags.json';
import type { NotepadState } from '../core/types';

export type NoteEntry = { id: string; title: string; act: number; phase: string; source: string; purpose: string; unlockCondition: string[]; relatedFlags: string[]; notes: string; content: string; entryType: 'clue' | 'decision'; triggerFlags: string[] };
type Collection<T> = { schemaVersion: number; items: T[] };
const getItems = <T>(document: unknown, name: string): T[] => {
  if (typeof document !== 'object' || document === null || !Array.isArray((document as Collection<T>).items)) throw new Error(`${name} 必须包含 items 数组。`);
  return (document as Collection<T>).items;
};
export const noteEntries = getItems<NoteEntry>(notesDocument, 'notes.json');
const flags = getItems<{ id: string }>(flagsDocument, 'flags.json');
export const noteById = new Map(noteEntries.map((entry) => [entry.id, entry]));
export function validateNoteData(): void {
  if (noteEntries.length < 2) throw new Error('记事本缺少阶段E-F条目。');
  const ids = new Set<string>();
  for (const entry of noteEntries) {
    if (ids.has(entry.id) || !entry.id || !entry.title || !entry.content || !['clue', 'decision'].includes(entry.entryType) || !Array.isArray(entry.triggerFlags) || !Array.isArray(entry.unlockCondition) || !Array.isArray(entry.relatedFlags)) throw new Error(`记事本条目无效：${entry.id}`);
    ids.add(entry.id);
    for (const flagId of [...entry.triggerFlags, ...entry.unlockCondition, ...entry.relatedFlags]) if (!flags.some((flag) => flag.id === flagId)) throw new Error(`${entry.id} 引用了未登记 Flag：${flagId}`);
  }
  if (noteById.get('NOTE_A1_E_001')?.content !== '七公里的路线，为什么连人或尸体都找不到？') throw new Error('NOTE_A1_E_001 文本必须保持冻结内容。');
}
validateNoteData();
export const getAutoEntries = (state: NotepadState): NoteEntry[] => [...new Set(state.autoEntryIds)].map((id) => noteById.get(id)).filter((entry): entry is NoteEntry => Boolean(entry));
