import document from '../../data/act2_school.json';
import flagsDocument from '../../data/flags.json';
import { ACT2_SCHOOL_AREA_IDS, ACT2_SCHOOL_HOTSPOT_IDS } from '../core/types';

export type SchoolArea = { id: string; title: string; imageId: string; description: string; links: string[] };
export type SchoolHotspot = { id: (typeof ACT2_SCHOOL_HOTSPOT_IDS)[number]; title: string; areaId: string; actionLabel: string; focus: { x: number; y: number }; content?: string; recordTitle?: string; studentName?: string; ranks?: number[] };
export type Act2SchoolData = { schemaVersion: number; record: { id: string; act: number; phase: string; unlockCondition: string[]; relatedFlags: string[] }; intro: string; areas: SchoolArea[]; hotspots: SchoolHotspot[]; notebookPage: { heading: string; lines: string[]; replacementNote: string }; softHint: string; matchNote: string };
export const act2School = document as Act2SchoolData;
export const schoolAreaById = new Map(act2School.areas.map((area) => [area.id, area]));
export const schoolHotspotById = new Map(act2School.hotspots.map((hotspot) => [hotspot.id, hotspot]));

export function validateAct2SchoolData(): void {
  const knownFlags = new Set((flagsDocument as { items: { id: string }[] }).items.map((flag) => flag.id));
  if (act2School.record.act !== 2 || act2School.record.phase !== 'A2_T05' || act2School.areas.length !== ACT2_SCHOOL_AREA_IDS.length) throw new Error('T05 学校可追溯记录或区域数量无效。');
  if (new Set(act2School.areas.map((area) => area.id)).size !== act2School.areas.length || ACT2_SCHOOL_AREA_IDS.some((id) => !schoolAreaById.has(id))) throw new Error('T05 区域 ID 必须完整且唯一。');
  if (new Set(act2School.hotspots.map((hotspot) => hotspot.id)).size !== act2School.hotspots.length || ACT2_SCHOOL_HOTSPOT_IDS.some((id) => !schoolHotspotById.has(id))) throw new Error('T05 调查热点 ID 必须完整且唯一。');
  for (const hotspot of act2School.hotspots) if (!schoolAreaById.has(hotspot.areaId) || !hotspot.focus || !Number.isFinite(hotspot.focus.x) || !Number.isFinite(hotspot.focus.y) || hotspot.focus.x < 5 || hotspot.focus.x > 95 || hotspot.focus.y < 5 || hotspot.focus.y > 95) throw new Error(`T05 图片热点区域或坐标无效：${hotspot.id}`);
  if (act2School.hotspots.find((item) => item.id === 'HOTSPOT_A2_T05_RANKS')?.ranks?.join(',') !== '600,400,300,130,88,53,20') throw new Error('T05 王澳名次顺序不正确。');
  if (!act2School.hotspots.find((item) => item.id === 'HOTSPOT_A2_T05_RANKS')?.studentName || !act2School.notebookPage.heading || act2School.notebookPage.lines.length === 0) throw new Error('T05 光荣榜或笔记页正文缺失。');
  for (const flagId of [...act2School.record.unlockCondition, ...act2School.record.relatedFlags]) if (!knownFlags.has(flagId)) throw new Error(`T05 数据引用未登记 Flag：${flagId}`);
  for (const area of act2School.areas) if (!area.title || !area.description || area.links.some((id) => !schoolAreaById.has(id))) throw new Error(`T05 区域内容或导航无效：${area.id}`);
  const qiming = schoolHotspotById.get('HOTSPOT_A2_T05_QIMING_TEXT')?.content ?? '';
  if (!qiming.includes('启明青少年成长中心两个月来对我的教育和培养')) throw new Error('T05 感谢文字缺少冻结原句。');
  if (act2School.matchNote !== '鸡公岭 ↔ 小A / 启明') throw new Error('T05 双 S 关联笔记超出冻结结论。');
}
validateAct2SchoolData();
