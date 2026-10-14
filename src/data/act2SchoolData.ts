import document from '../../data/act2_school.json';
import flagsDocument from '../../data/flags.json';
import { ACT2_SCHOOL_AREA_IDS, ACT2_SCHOOL_HOTSPOT_IDS } from '../core/types';

export type SchoolArea = { id: string; title: string; imageId: string; description: string; links: string[] };
export type SchoolCampusLocation = { id: string; title: string; x: number; y: number; labelX: number; labelY: number; imageId: string; areaId?: string; description: string; links: string[] };
export type SchoolCampusMapPoint = { x: number; y: number };
export type SchoolCampusRoutePolyline = { from: string; to: string; points: SchoolCampusMapPoint[] };
export type SchoolHotspot = { id: (typeof ACT2_SCHOOL_HOTSPOT_IDS)[number]; title: string; areaId: string; actionLabel: string; focus: { x: number; y: number }; content?: string; recordTitle?: string; studentName?: string; ranks?: number[] };
export type Act2SchoolData = { schemaVersion: number; record: { id: string; act: number; phase: string; unlockCondition: string[]; relatedFlags: string[] }; intro: string; areas: SchoolArea[]; hotspots: SchoolHotspot[]; notebookPage: { heading: string; lines: string[]; replacementNote: string }; softHint: string; matchNote: string };
export const act2School = document as Act2SchoolData;
export const schoolAreaById = new Map(act2School.areas.map((area) => [area.id, area]));
export const schoolHotspotById = new Map(act2School.hotspots.map((hotspot) => [hotspot.id, hotspot]));

/** North-up campus plan coordinates and walkable outdoor links from the frozen map contract. */
export const schoolCampusLocations: SchoolCampusLocation[] = [
  { id: 'CAMPUS_SOUTH_GATE', title: '南门', x: 50, y: 81.5, labelX: 36, labelY: 85, imageId: 'IMG_A2_SCHOOL_GATE_001', areaId: 'AREA_A2_T05_GATE', description: '从南门进入校园，沿着户外道路先到入口广场。', links: ['CAMPUS_COURTYARD'] },
  { id: 'CAMPUS_COURTYARD', title: '室外广场', x: 50, y: 74.5, labelX: 50, labelY: 58, imageId: 'IMG_A2_SCHOOL_COURTYARD_001', description: '南门内的室外广场连着教学楼、光荣榜、宣传栏、操场与宿舍方向。', links: ['CAMPUS_SOUTH_GATE', 'CAMPUS_BUILDING', 'CAMPUS_HONOR', 'CAMPUS_NOTICE', 'CAMPUS_PLAYGROUND', 'CAMPUS_DORM'] },
  { id: 'CAMPUS_HONOR', title: '光荣榜', x: 64.6, y: 72.3, labelX: 80, labelY: 72.3, imageId: 'IMG_A2_SCHOOL_HONOR_001', areaId: 'AREA_A2_T05_HONOR_ROLL', description: schoolAreaById.get('AREA_A2_T05_HONOR_ROLL')!.description, links: ['CAMPUS_COURTYARD', 'CAMPUS_NOTICE'] },
  { id: 'CAMPUS_NOTICE', title: '宣传栏', x: 37.2, y: 72.3, labelX: 12, labelY: 72.3, imageId: 'IMG_A2_SCHOOL_NOTICE_001', areaId: 'AREA_A2_T05_NOTICE_BOARD', description: schoolAreaById.get('AREA_A2_T05_NOTICE_BOARD')!.description, links: ['CAMPUS_COURTYARD', 'CAMPUS_HONOR'] },
  { id: 'CAMPUS_BUILDING', title: '教学楼', x: 51.4, y: 40.5, labelX: 51.4, labelY: 25, imageId: 'IMG_A2_SCHOOL_BUILDING_001', description: '从广场沿室外道路走到教学楼。教学楼整体外景在眼前，入口通向记忆里的走廊。', links: ['CAMPUS_COURTYARD'] },
  { id: 'CAMPUS_PLAYGROUND', title: '西操场', x: 24.5, y: 43, labelX: 24.5, labelY: 27, imageId: 'IMG_A2_SCHOOL_PLAYGROUND_001', description: '西侧操场沿室外道路连回入口广场。这里只能浏览环境。', links: ['CAMPUS_COURTYARD'] },
  { id: 'CAMPUS_DORM', title: '东北宿舍', x: 83, y: 21.5, labelX: 88, labelY: 39, imageId: 'IMG_A2_SCHOOL_DORM_001', description: '东北方向是旧宿舍楼，旁边有一条回到入口广场的室外道路。这里只能浏览环境。', links: ['CAMPUS_COURTYARD'] },
];
export const schoolCampusLocationById = new Map(schoolCampusLocations.map((location) => [location.id, location]));

/** Walkable campus paths in image coordinates. Endpoints always match the real map anchors above. */
export const schoolCampusRoutePolylines: SchoolCampusRoutePolyline[] = [
  { from: 'CAMPUS_SOUTH_GATE', to: 'CAMPUS_COURTYARD', points: [{ x: 50, y: 81.5 }, { x: 50, y: 74.5 }] },
  { from: 'CAMPUS_COURTYARD', to: 'CAMPUS_BUILDING', points: [{ x: 50, y: 74.5 }, { x: 55.5, y: 74.5 }, { x: 55.5, y: 60 }, { x: 51.4, y: 60 }, { x: 51.4, y: 40.5 }] },
  { from: 'CAMPUS_COURTYARD', to: 'CAMPUS_HONOR', points: [{ x: 50, y: 74.5 }, { x: 64.6, y: 74.5 }, { x: 64.6, y: 72.3 }] },
  { from: 'CAMPUS_COURTYARD', to: 'CAMPUS_NOTICE', points: [{ x: 50, y: 74.5 }, { x: 37.2, y: 74.5 }, { x: 37.2, y: 72.3 }] },
  { from: 'CAMPUS_COURTYARD', to: 'CAMPUS_PLAYGROUND', points: [{ x: 50, y: 74.5 }, { x: 32.5, y: 74.5 }, { x: 32.5, y: 51.5 }, { x: 24.5, y: 51.5 }, { x: 24.5, y: 43 }] },
  { from: 'CAMPUS_COURTYARD', to: 'CAMPUS_DORM', points: [{ x: 50, y: 74.5 }, { x: 73.5, y: 74.5 }, { x: 73.5, y: 26.5 }, { x: 83, y: 26.5 }, { x: 83, y: 21.5 }] },
  { from: 'CAMPUS_HONOR', to: 'CAMPUS_NOTICE', points: [{ x: 64.6, y: 72.3 }, { x: 64.6, y: 74.5 }, { x: 37.2, y: 74.5 }, { x: 37.2, y: 72.3 }] },
];
const campusEdgeKey = (from: string, to: string) => [from, to].sort().join('::');

const shortestRoute = <T extends { id: string; links: string[] }>(locations: readonly T[], from: string, to: string): string[] => {
  if (from === to) return locations.some((item) => item.id === from) ? [from] : [];
  const byId = new Map(locations.map((location) => [location.id, location]));
  if (!byId.has(from) || !byId.has(to)) return [];
  const queue = [from];
  const previous = new Map<string, string | null>([[from, null]]);
  for (let index = 0; index < queue.length; index += 1) {
    const currentId = queue[index];
    if (currentId === to) break;
    for (const neighbor of byId.get(currentId)!.links) {
      if (!byId.has(neighbor) || previous.has(neighbor)) continue;
      previous.set(neighbor, currentId);
      queue.push(neighbor);
    }
  }
  if (!previous.has(to)) return [];
  const route = [to];
  let current = to;
  while (previous.get(current)) {
    current = previous.get(current)!;
    route.push(current);
  }
  return route.reverse();
};

export const schoolAreaRoute = (from: string, to: string): string[] => shortestRoute(act2School.areas, from, to);
export const schoolCampusRoute = (from: string, to: string): string[] => shortestRoute(schoolCampusLocations, from, to);

export function validateAct2SchoolData(): void {
  const knownFlags = new Set((flagsDocument as { items: { id: string }[] }).items.map((flag) => flag.id));
  if (act2School.record.act !== 2 || act2School.record.phase !== 'A2_T05' || act2School.areas.length !== ACT2_SCHOOL_AREA_IDS.length) throw new Error('T05 学校可追溯记录或区域数量无效。');
  if (new Set(act2School.areas.map((area) => area.id)).size !== act2School.areas.length || ACT2_SCHOOL_AREA_IDS.some((id) => !schoolAreaById.has(id))) throw new Error('T05 区域 ID 必须完整且唯一。');
  if (new Set(act2School.areas.map((area) => area.imageId)).size !== 8 || act2School.areas.some((area) => !/^IMG_A2_SCHOOL_[A-Z]+_001$/.test(area.imageId))) throw new Error('T05 八个地点必须各有一张独立学校照片。');
  if (new Set(act2School.hotspots.map((hotspot) => hotspot.id)).size !== act2School.hotspots.length || ACT2_SCHOOL_HOTSPOT_IDS.some((id) => !schoolHotspotById.has(id))) throw new Error('T05 调查热点 ID 必须完整且唯一。');
  for (const hotspot of act2School.hotspots) if (!schoolAreaById.has(hotspot.areaId) || !hotspot.focus || !Number.isFinite(hotspot.focus.x) || !Number.isFinite(hotspot.focus.y) || hotspot.focus.x < 5 || hotspot.focus.x > 95 || hotspot.focus.y < 5 || hotspot.focus.y > 95) throw new Error(`T05 图片热点区域或坐标无效：${hotspot.id}`);
  if (act2School.hotspots.find((item) => item.id === 'HOTSPOT_A2_T05_RANKS')?.ranks?.join(',') !== '600,400,300,130,88,53,20') throw new Error('T05 王澳名次顺序不正确。');
  if (!act2School.hotspots.find((item) => item.id === 'HOTSPOT_A2_T05_RANKS')?.studentName || !act2School.notebookPage.heading || act2School.notebookPage.lines.length === 0) throw new Error('T05 光荣榜或笔记页正文缺失。');
  for (const flagId of [...act2School.record.unlockCondition, ...act2School.record.relatedFlags]) if (!knownFlags.has(flagId)) throw new Error(`T05 数据引用未登记 Flag：${flagId}`);
  for (const area of act2School.areas) if (!area.title || !area.description || area.links.some((id) => !schoolAreaById.has(id))) throw new Error(`T05 区域内容或导航无效：${area.id}`);
  for (const area of act2School.areas) for (const neighbor of area.links) if (!schoolAreaById.get(neighbor)?.links.includes(area.id)) throw new Error(`T05 室内外步行路线必须双向：${area.id} ↔ ${neighbor}`);
  for (const location of schoolCampusLocations) {
    if (location.x < 0 || location.x > 100 || location.y < 0 || location.y > 100 || location.labelX < 0 || location.labelX > 100 || location.labelY < 0 || location.labelY > 100 || location.links.some((id) => !schoolCampusLocationById.has(id))) throw new Error(`T05 校园总图坐标或路线无效：${location.id}`);
    for (const neighbor of location.links) if (!schoolCampusLocationById.get(neighbor)?.links.includes(location.id)) throw new Error(`T05 校园路线必须双向：${location.id} ↔ ${neighbor}`);
  }
  const campusEdges = new Set(schoolCampusLocations.flatMap((location) => location.links.map((neighbor) => campusEdgeKey(location.id, neighbor))));
  const renderedCampusEdges = new Set(schoolCampusRoutePolylines.map(({ from, to }) => campusEdgeKey(from, to)));
  if (campusEdges.size !== renderedCampusEdges.size || renderedCampusEdges.size !== schoolCampusRoutePolylines.length || [...campusEdges].some((edge) => !renderedCampusEdges.has(edge))) throw new Error('T05 校园路线折线必须与双向步行路线一一对应。');
  for (const path of schoolCampusRoutePolylines) {
    const from = schoolCampusLocationById.get(path.from);
    const to = schoolCampusLocationById.get(path.to);
    if (!from || !to || !from.links.includes(to.id) || path.points.length < 2 || path.points.some(({ x, y }) => x < 0 || x > 100 || y < 0 || y > 100)) throw new Error(`T05 校园路线折线无效：${path.from} ↔ ${path.to}`);
    const first = path.points[0];
    const last = path.points[path.points.length - 1];
    if (first.x !== from.x || first.y !== from.y || last.x !== to.x || last.y !== to.y) throw new Error(`T05 校园路线折线必须接到真实节点锚点：${path.from} ↔ ${path.to}`);
  }
  if (schoolCampusRoute('CAMPUS_SOUTH_GATE', 'CAMPUS_BUILDING').join('>') !== 'CAMPUS_SOUTH_GATE>CAMPUS_COURTYARD>CAMPUS_BUILDING') throw new Error('T05 校园教学楼路线必须经入口广场。');
  const qiming = schoolHotspotById.get('HOTSPOT_A2_T05_QIMING_TEXT')?.content ?? '';
  if (!qiming.includes('启明青少年成长中心两个月来对我的教育和培养')) throw new Error('T05 感谢文字缺少冻结原句。');
  if (act2School.matchNote !== '鸡公岭 ↔ 小A / 启明') throw new Error('T05 双 S 关联笔记超出冻结结论。');
}
validateAct2SchoolData();
