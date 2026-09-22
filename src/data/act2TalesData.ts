import talesDocument from '../../data/act2_tales.json';

export type TaleColumn = '人物' | '缺失' | '进食' | '获得与异变';
export type TaleRecord = { id: string; title: string; era: string; page: string; summary: string; noteId?: string; modernExplanation?: string; paragraphs?: string[] };
export type TaleCard = { id: string; column: TaleColumn; text: string };
export type Act2TalesData = {
  schemaVersion: number;
  record: { id: string; title: string; act: number; phase: string; source: string; purpose: string; unlockCondition: string[]; relatedFlags: string[]; notes: string };
  scene: { eyebrow: string; title: string; intro: string; returnLabel: string; collectLabel: string; collectionTitle: string; sortTitle: string; sortHint: string; inference: string[]; acknowledgeLabel: string };
  records: TaleRecord[];
  cards: TaleCard[];
};

export const act2Tales = talesDocument as unknown as Act2TalesData;
export const tales = act2Tales.records.filter((record): record is TaleRecord & Required<Pick<TaleRecord, 'noteId' | 'modernExplanation' | 'paragraphs'>> => record.id.startsWith('TALE_'));
export const taleNoiseRecords = act2Tales.records.filter((record) => record.id.startsWith('RECORD_'));
export const taleById = new Map(tales.map((tale) => [tale.id, tale]));
export const taleCards = act2Tales.cards;
export const taleCardById = new Map(taleCards.map((card) => [card.id, card]));
export const taleColumns: TaleColumn[] = ['人物', '缺失', '进食', '获得与异变'];

export function validateAct2TalesData(): void {
  if (act2Tales.record.act !== 2 || act2Tales.record.phase !== 'A2_T04') throw new Error('T04 可追溯记录无效。');
  if (tales.length !== 3 || taleNoiseRecords.length < 5) throw new Error('T04 必须含三篇志异与至少五条噪音索引。');
  if (new Set(act2Tales.records.map((record) => record.id)).size !== act2Tales.records.length) throw new Error('T04 索引 ID 重复。');
  if (new Set(taleCards.map((card) => card.id)).size !== 12 || taleCards.length !== 12) throw new Error('T04 必须有十二张唯一卡片。');
  for (const tale of tales) {
    if (!tale.noteId || !tale.modernExplanation || !tale.paragraphs?.length) throw new Error(`T04 志异正文不完整：${tale.id}`);
    if (tale.paragraphs.some((paragraph) => !paragraph.trim())) throw new Error(`T04 志异正文含空段：${tale.id}`);
  }
  for (const column of taleColumns) if (taleCards.filter((card) => card.column === column).length !== 3) throw new Error(`T04 卡片列不完整：${column}`);
}
validateAct2TalesData();
