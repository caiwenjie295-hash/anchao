import t00Document from '../../data/act3_t00.json';
import t01Document from '../../data/act3_t01.json';
import t02Document from '../../data/act3_t02.json';
import type { Act3Hotspot, Act3Lens } from '../core/types';

export interface Act3StageDocument {
  stage: 'T00' | 'T01' | 'T02';
  intro: string;
  lenses: Act3Lens[];
}

const isHotspot = (value: unknown): value is Act3Hotspot => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.clueId === 'string' && typeof record.label === 'string';
};

const toLens = (value: unknown): Act3Lens => {
  const record = (value ?? {}) as Record<string, unknown>;
  const stance = typeof record.stance === 'string' && ['look', 'approach', 'crouch', 'enter'].includes(record.stance)
    ? record.stance as Act3Lens['stance']
    : 'look';
  const rawHotspots = Array.isArray(record.hotspots) ? record.hotspots : [];
  return {
    id: typeof record.id === 'string' ? record.id : '',
    title: typeof record.title === 'string' ? record.title : '',
    stance,
    assetId: typeof record.assetId === 'string' ? record.assetId : '',
    description: typeof record.description === 'string' ? record.description : '',
    hotspots: rawHotspots.filter(isHotspot).map((item) => ({ clueId: item.clueId, label: item.label })),
    links: Array.isArray(record.links) ? record.links.filter((item): item is string => typeof item === 'string' && item.length > 0) : [],
  };
};

const toDoc = (document: { stage: string; intro: string; lenses: unknown[] }): Act3StageDocument => ({
  stage: document.stage === 'T00' || document.stage === 'T01' || document.stage === 'T02' ? document.stage : 'T00',
  intro: typeof document.intro === 'string' ? document.intro : '',
  lenses: Array.isArray(document.lenses) ? document.lenses.map(toLens) : [],
});

export const act3T00: Act3StageDocument = toDoc(t00Document);
export const act3T01: Act3StageDocument = toDoc(t01Document);
export const act3T02: Act3StageDocument = toDoc(t02Document);

const stageDocs: Record<'T00' | 'T01' | 'T02', Act3StageDocument> = {
  T00: act3T00,
  T01: act3T01,
  T02: act3T02,
};

export const act3StageDoc = (stage: 'T00' | 'T01' | 'T02'): Act3StageDocument => stageDocs[stage];

/** 收集某阶段所有镜头的全部线索 ID。 */
export const act3StageClueIds = (stage: 'T00' | 'T01' | 'T02'): string[] => {
  const doc = stageDocs[stage];
  const ids: string[] = [];
  for (const lens of doc.lenses) {
    for (const hotspot of lens.hotspots) {
      if (!ids.includes(hotspot.clueId)) ids.push(hotspot.clueId);
    }
  }
  return ids;
};

/** 各阶段的完成 Flag、门槛 Flag 与后续阶段。 */
export const ACT3_STAGE_COMPLETION_FLAG: Record<'T00' | 'T01' | 'T02', string> = {
  T00: 'FLAG_A3_OLD_ROAD_FOUND',
  T01: 'FLAG_A3_QIMING_SITE_CONFIRMED',
  T02: 'FLAG_A3_CLASSROOM_CONTRADICTION_NOTED',
};

export const ACT3_STAGE_GATE_FLAG: Record<'T00' | 'T01' | 'T02', string> = {
  T00: 'FLAG_A3_GATE_REACHED',
  T01: 'FLAG_A3_INNER_FENCE_PASSED',
  T02: 'FLAG_A3_CLASSROOM_TURNED',
};

export const ACT3_STAGE_NEXT: Record<'T00' | 'T01' | 'T02', 'T00' | 'T01' | 'T02' | null> = {
  T00: 'T01',
  T01: 'T02',
  T02: null,
};

const byIdMaps = new Map<string, Map<string, Act3Lens>>();

export const act3LensById = (stage: 'T00' | 'T01' | 'T02', lensId: string): Act3Lens | null => {
  let map = byIdMaps.get(stage);
  if (!map) {
    map = new Map(stageDocs[stage].lenses.map((lens) => [lens.id, lens]));
    byIdMaps.set(stage, map);
  }
  return map.get(lensId) ?? null;
};

const firstLensIndex: Record<'T00' | 'T01' | 'T02', string> = {
  T00: 'LENS_A3_T00_001',
  T01: 'LENS_A3_T01_001',
  T02: 'LENS_A3_T02_001',
};

export const act3FirstLensId = (stage: 'T00' | 'T01' | 'T02'): string => firstLensIndex[stage];