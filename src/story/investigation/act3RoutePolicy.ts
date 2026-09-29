import { act3FirstLensId, act3LensById, act3StageDoc, type AuthoredAct3Stage } from '../../data/act3Data';
import type { InvestigationActionState } from '../../components/investigation/types';

export interface Act3RouteAvailability {
  state: InvestigationActionState;
  reason?: string;
  relatedClueIds: string[];
}

export function getAct3RouteAvailability(
  stage: AuthoredAct3Stage,
  currentLensId: string | null,
  targetLensId: string,
  inspectedClueIds: string[],
): Act3RouteAvailability {
  if (!currentLensId && targetLensId === act3FirstLensId(stage)) {
    return { state: 'ready', relatedClueIds: [] };
  }
  const current = currentLensId ? act3LensById(stage, currentLensId) : null;
  const route = current?.routes.find((item) => item.target === targetLensId);
  const target = act3LensById(stage, targetLensId);
  if (!route || !target) return { state: 'unavailable', relatedClueIds: [] };

  const relatedClueIds = (target.requiresClueIds ?? []).filter((id) => !inspectedClueIds.includes(id));
  if (!relatedClueIds.length) return { state: 'ready', relatedClueIds: [] };

  const labels = new Map(
    act3StageDoc(stage).lenses.flatMap((lens) => lens.hotspots.map((hotspot) => [hotspot.clueId, hotspot.label] as const)),
  );
  const materialNames = relatedClueIds.map((id) => labels.get(id) ?? '一项已知材料');
  return {
    state: 'blocked',
    reason: '还没有核对' + materialNames.join('、') + '。',
    relatedClueIds,
  };
}

/** 在已发现的镜头连接中找一条可走路线，用于从受阻说明直接打开相关材料。 */
export function findAct3RoutePathToClue(
  stage: AuthoredAct3Stage,
  currentLensId: string | null,
  targetClueId: string,
  inspectedClueIds: string[],
): string[] | null {
  const start = currentLensId ?? act3FirstLensId(stage);
  const doc = act3StageDoc(stage);
  const lensWithClue = doc.lenses.find((lens) => lens.hotspots.some((hotspot) => hotspot.clueId === targetClueId));
  if (!lensWithClue) return null;
  if (start === lensWithClue.id) return [];

  const queue: Array<{ lensId: string; path: string[] }> = [{ lensId: start, path: [] }];
  const visited = new Set([start]);
  while (queue.length) {
    const { lensId, path } = queue.shift()!;
    const lens = act3LensById(stage, lensId);
    if (!lens) continue;
    for (const route of lens.routes) {
      if (visited.has(route.target)) continue;
      const target = act3LensById(stage, route.target);
      if (!target || (target.requiresClueIds ?? []).some((id) => !inspectedClueIds.includes(id))) continue;
      const nextPath = [...path, route.target];
      if (route.target === lensWithClue.id) return nextPath;
      visited.add(route.target);
      queue.push({ lensId: route.target, path: nextPath });
    }
  }
  return null;
}
