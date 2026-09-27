import t00Document from '../../data/act3_t00.json';
import t01Document from '../../data/act3_t01.json';
import t02Document from '../../data/act3_t02.json';
import t03Document from '../../data/act3_t03.json';
import t04Document from '../../data/act3_t04.json';
import t05Document from '../../data/act3_t05.json';
import t06Document from '../../data/act3_t06.json';
import t07Document from '../../data/act3_t07.json';
import type { Act3Hotspot, Act3Lens } from '../core/types';

export type AuthoredAct3Stage = 'T00' | 'T01' | 'T02' | 'T03' | 'T04' | 'T05' | 'T06' | 'T07';
export interface Act3StageDocument {
  stage: AuthoredAct3Stage;
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
    requiresClueIds: Array.isArray(record.requiresClueIds) ? record.requiresClueIds.filter((item): item is string => typeof item === 'string' && item.length > 0) : undefined,
  };
};

const toDoc = (document: { stage: string; intro: string; lenses: unknown[] }): Act3StageDocument => ({
  stage: document.stage === 'T00' || document.stage === 'T01' || document.stage === 'T02' || document.stage === 'T03' || document.stage === 'T04' || document.stage === 'T05' || document.stage === 'T06' || document.stage === 'T07' ? document.stage : 'T00',
  intro: typeof document.intro === 'string' ? document.intro : '',
  lenses: Array.isArray(document.lenses) ? document.lenses.map(toLens) : [],
});

export const act3T00: Act3StageDocument = toDoc(t00Document);
export const act3T01: Act3StageDocument = toDoc(t01Document);
export const act3T02: Act3StageDocument = toDoc(t02Document);
export const act3T03: Act3StageDocument = toDoc(t03Document);
export const act3T04: Act3StageDocument = toDoc(t04Document);
export const act3T05: Act3StageDocument = toDoc(t05Document);
export const act3T06: Act3StageDocument = toDoc(t06Document);
export const act3T07: Act3StageDocument = toDoc(t07Document);

const stageDocs: Record<AuthoredAct3Stage, Act3StageDocument> = {
  T00: act3T00,
  T01: act3T01,
  T02: act3T02,
  T03: act3T03,
  T04: act3T04,
  T05: act3T05,
  T06: act3T06,
  T07: act3T07,
};

export const act3StageDoc = (stage: AuthoredAct3Stage): Act3StageDocument => stageDocs[stage];

/** 收集某阶段所有镜头的全部线索 ID。 */
export const act3StageClueIds = (stage: AuthoredAct3Stage): string[] => {
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
export const ACT3_STAGE_COMPLETION_FLAG: Record<AuthoredAct3Stage, string> = {
  T00: 'FLAG_A3_OLD_ROAD_FOUND',
  T01: 'FLAG_A3_QIMING_SITE_CONFIRMED',
  T02: 'FLAG_A3_CLASSROOM_CONTRADICTION_NOTED',
  T03: 'FLAG_A3_CONFINEMENT_SITE_CONFIRMED',
  T04: 'FLAG_A3_VVAKE_PAPER_FOUND',
  T05: 'FLAG_A3_13ACK_PAPER_FOUND',
  T06: 'FLAG_A3_HEIBUMU_QIMING_LINK_CONFIRMED',
  T07: 'FLAG_A3_COMPLETE',
};

export const ACT3_STAGE_GATE_FLAG: Record<AuthoredAct3Stage, string> = {
  T00: 'FLAG_A3_GATE_REACHED',
  T01: 'FLAG_A3_INNER_FENCE_PASSED',
  T02: 'FLAG_A3_CLASSROOM_TURNED',
  T03: 'FLAG_A3_STAIRS_DESCENDED',
  T04: 'FLAG_A3_BROADCAST_DOOR_REACHED',
  T05: 'FLAG_A3_KITCHEN_DOOR_REACHED',
  T06: 'FLAG_A3_KITCHEN_EXITED',
  T07: 'FLAG_A3_SITE_EXITED',
};

export const ACT3_STAGE_NEXT: Record<AuthoredAct3Stage, AuthoredAct3Stage | null> = {
  T00: 'T01',
  T01: 'T02',
  T02: 'T03',
  T03: 'T04',
  T04: 'T05',
  T05: 'T06',
  T06: 'T07',
  T07: null,
};

const byIdMaps = new Map<string, Map<string, Act3Lens>>();

export const act3LensById = (stage: AuthoredAct3Stage, lensId: string): Act3Lens | null => {
  let map = byIdMaps.get(stage);
  if (!map) {
    map = new Map(stageDocs[stage].lenses.map((lens) => [lens.id, lens]));
    byIdMaps.set(stage, map);
  }
  return map.get(lensId) ?? null;
};

const firstLensIndex: Record<AuthoredAct3Stage, string> = {
  T00: 'LENS_A3_T00_001',
  T01: 'LENS_A3_T01_001',
  T02: 'LENS_A3_T02_001',
  T03: 'LENS_A3_T03_001',
  T04: 'LENS_A3_T04_001',
  T05: 'LENS_A3_T05_001',
  T06: 'LENS_A3_T06_001',
  T07: 'LENS_A3_T07_001',
};

export const act3FirstLensId = (stage: AuthoredAct3Stage): string => firstLensIndex[stage];
