import t00Document from '../../data/act3_t00.json';
import t01Document from '../../data/act3_t01.json';
import t02Document from '../../data/act3_t02.json';
import t03Document from '../../data/act3_t03.json';
import t04Document from '../../data/act3_t04.json';
import t05Document from '../../data/act3_t05.json';
import t06Document from '../../data/act3_t06.json';
import t07Document from '../../data/act3_t07.json';
import type { Act3Hotspot, Act3Lens, Act3Route } from '../core/types';

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
  const rawRoutes = Array.isArray(record.routes) ? record.routes : [];
  const routes: Act3Route[] = rawRoutes.flatMap((route) => {
    if (!route || typeof route !== 'object') return [];
    const item = route as Record<string, unknown>;
    if (typeof item.actionId !== 'string' || typeof item.target !== 'string' || typeof item.label !== 'string') return [];
    if (item.kind !== 'move' && item.kind !== 'return') return [];
    return [{ actionId: item.actionId, kind: item.kind, target: item.target, label: item.label }];
  });
  const legacyLinks = Array.isArray(record.links) ? record.links.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
  if (routes.length === 0) {
    for (const [index, target] of legacyLinks.entries()) {
      routes.push({ actionId: 'A3_ROUTE_LEGACY_' + index + '_' + target, kind: 'move', target, label: '前往相邻位置' });
    }
  }
  return {
    id: typeof record.id === 'string' ? record.id : '',
    title: typeof record.title === 'string' ? record.title : '',
    stance,
    assetId: typeof record.assetId === 'string' ? record.assetId : '',
    description: typeof record.description === 'string' ? record.description : '',
    hotspots: rawHotspots.filter(isHotspot).map((item) => ({
      clueId: item.clueId,
      label: item.label,
      // A34-NARRATIVE-0001：玩家可见的物件正文必须从数据透传到运行时类型。
      observation: typeof item.observation === 'string' ? item.observation : undefined,
    })),
    routes,
    links: routes.map((route) => route.target),
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

/** 核心结论所需证据；其它热点是可选环境观察，不阻止阶段离开。 */
export const ACT3_REQUIRED_EVIDENCE: Record<AuthoredAct3Stage, Array<{ clueId: string; reason: string }>> = {
  T00: [
    { clueId: 'CLUE_A3_T00_CABLE_BREAK', reason: '断裂电缆支持旧路仍与人工设施相连。' },
    { clueId: 'CLUE_A3_T00_DRAIN_DISCOVERED', reason: '排水沟与规整路基共同支持这里存在旧通行路线。' },
  ],
  T01: [
    { clueId: 'CLUE_A3_T01_GATE_VIEW', reason: '入口结构确立调查者到达围墙内侧。' },
    { clueId: 'CLUE_A3_T01_SIGN_REVEALED', reason: '露出的标牌把旧址与启明名称联系起来。' },
    { clueId: 'CLUE_A3_T01_MAIN_BUILDING', reason: '主楼证据确认这不是只有入口遗迹的地点。' },
  ],
  T02: [
    { clueId: 'CLUE_A3_T02_BLACKBOARD', reason: '黑板内容提供现场教育信息的直接记录。' },
    { clueId: 'CLUE_A3_T02_SLOGAN_SPEAKER', reason: '宣传标语与现场记录形成需要保留的矛盾。' },
  ],
  T03: [
    { clueId: 'CLUE_A3_T03_24H', reason: '二十四小时标记支持这里存在持续管理的安排。' },
    { clueId: 'CLUE_A3_T03_PEEPHOLES', reason: '观察孔支持空间具有监视用途。' },
    { clueId: 'CLUE_A3_T03_48_72H', reason: '时长标记补足禁闭区用途判断，不要求检查重复走廊。' },
  ],
  T04: [{ clueId: 'CLUE_A3_T04_VVAKE_PAPER', reason: '纸片上的 VVaKe 词表是本阶段需要带走的材料。' }],
  T05: [{ clueId: 'CLUE_A3_T05_13ACK_PAPER', reason: '纸片上的 13aCK 词表与上一阶段材料构成对照。' }],
  T06: [
    { clueId: 'CLUE_A3_T06_SHRINE', reason: '神龛现状支持此处曾有供奉位置。' },
    { clueId: 'CLUE_A3_T06_EMPTY_BASE', reason: '空底座明确记录原有物件如今不在现场。' },
    { clueId: 'CLUE_A3_T06_TEMPLE_COMPARE', reason: '与旧庙照片比对后才形成关联迹象，仍不证明来源。' },
  ],
  T07: [
    { clueId: 'CLUE_A3_T07_XIAOYUE_MEMORY', reason: '小月的回忆为选择观察方式提供已有依据。' },
    { clueId: 'CLUE_A3_T07_BACK_GAP', reason: '胶带痕迹支持消防栓背后曾藏有物品。' },
    { clueId: 'CLUE_A3_T07_NOTEBOOK_PICKUP', reason: '取出笔记是带走关键材料的实际行动。' },
    { clueId: 'CLUE_A3_T07_FIRST_PAGE', reason: '扉页 A.W 记录支持小 A 到过这里并留下笔记。' },
  ],
};

export const act3RequiredClueIds = (stage: AuthoredAct3Stage): string[] =>
  ACT3_REQUIRED_EVIDENCE[stage].map(({ clueId }) => clueId);

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
