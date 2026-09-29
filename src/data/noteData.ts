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

/** 第二幕 T01–T03 由本模块统一登记，供并行任务按 ID 消费。 */
export const ACT2_NOTE_IDS = ['NOTE_A2_T01_001', 'NOTE_A2_T01_002', 'NOTE_A2_T02_001', 'NOTE_A2_T02_002', 'NOTE_A2_T03_001', 'NOTE_A2_T04_001', 'NOTE_A2_T04_002', 'NOTE_A2_T04_003', 'NOTE_A2_T04_004', 'NOTE_A2_T05_001', 'NOTE_A2_T05_002', 'NOTE_A2_T05_003', 'NOTE_A2_T05_004', 'NOTE_A2_T06_001', 'NOTE_A2_T06_002', 'NOTE_A2_T06_003', 'NOTE_A2_T06_004'];
const act2NoteRequiredText: Record<string, string[]> = {
  NOTE_A2_T01_001: ['这次搜索没有找到能回答问题的资料', '当地人才知道'],
  NOTE_A2_T01_002: ['这个词太普通了'],
  NOTE_A2_T02_001: ['hei bu mu', '黑', '捕', '补', '埔', '木', '母', '墓'],
  NOTE_A2_T02_002: ['黑补母', '吃什么补什么', '县志'],
  NOTE_A2_T03_001: ['补缺', '以有余补不足'],
  NOTE_A2_T04_001: ['周三', '山鸡'],
  NOTE_A2_T04_002: ['六儿', '沈'],
  NOTE_A2_T04_003: ['哑女', '画眉'],
  NOTE_A2_T04_004: ['小A缺什么？'],
  NOTE_A2_T05_001: ['高二休学两个月', '返校后安静', '成绩提升'],
  NOTE_A2_T05_002: ['600', '400', '300', '130', '88', '53', '20'],
  NOTE_A2_T05_003: ['启明青少年成长中心两个月来对我的教育和培养'],
  NOTE_A2_T05_004: ['鸡公岭', '小A / 启明'],
  NOTE_A2_T06_001: ['搜索结果几乎都是宣传材料', '孝顺'],
  NOTE_A2_T06_002: ['强行送入训练中心', '没有独立核实'],
  NOTE_A2_T06_003: ['黄子山', '黄山', '钟子月', '月子'],
  NOTE_A2_T06_004: ['下落不明', '精神状态异常', '不止发生在小A身上'],
};
/** T04 才揭示的结论不得提前出现在第二幕摘录里。 */
const act2NoteForbiddenText: Record<string, string[]> = { NOTE_A2_T03_001: ['记忆', '身份'] };

export function validateNoteData(): void {
  if (noteEntries.length < 2) throw new Error('记事本缺少阶段E-F条目。');
  const ids = new Set<string>();
  for (const entry of noteEntries) {
    if (ids.has(entry.id) || !entry.id || !entry.title || !entry.content || !['clue', 'decision'].includes(entry.entryType) || !Array.isArray(entry.triggerFlags) || !Array.isArray(entry.unlockCondition) || !Array.isArray(entry.relatedFlags)) throw new Error(`记事本条目无效：${entry.id}`);
    ids.add(entry.id);
    for (const flagId of [...entry.triggerFlags, ...entry.unlockCondition, ...entry.relatedFlags]) if (!flags.some((flag) => flag.id === flagId)) throw new Error(`${entry.id} 引用了未登记 Flag：${flagId}`);
  }
  if (noteById.get('NOTE_A1_E_001')?.content !== '七公里的路线，为什么连人或尸体都找不到？') throw new Error('NOTE_A1_E_001 文本必须保持冻结内容。');
  for (const noteId of ACT2_NOTE_IDS) {
    const entry = noteById.get(noteId);
    if (!entry) throw new Error(`第二幕笔记缺少登记：${noteId}`);
    for (const text of act2NoteRequiredText[noteId] ?? []) if (!entry.content.includes(text)) throw new Error(`${noteId} 缺少冻结内容：${text}`);
    for (const text of act2NoteForbiddenText[noteId] ?? []) if (entry.content.includes(text)) throw new Error(`${noteId} 泄露了后续结论：${text}`);
  }
}
validateNoteData();
export const getAutoEntries = (state: NotepadState): NoteEntry[] => [...new Set(state.autoEntryIds)].map((id) => noteById.get(id)).filter((entry): entry is NoteEntry => Boolean(entry));
