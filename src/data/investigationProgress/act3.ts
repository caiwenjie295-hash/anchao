import type { AppState, Act3ActiveStage } from '../../core/types';

import { ACT3_REQUIRED_EVIDENCE, ACT3_STAGE_COMPLETION_FLAG, act3FirstLensId, act3LensById, act3RequiredClueIds, act3StageDoc, type AuthoredAct3Stage } from '../act3Data';

import { act3ObjectiveFor, act3PlaceForLens } from '../act3Presentation';

import { findAct3RoutePathToClue, getAct3RouteAvailability } from '../../story/investigation/act3RoutePolicy';

import { act3HotspotActionLabel, act3RouteActionLabel, act3StageActionLabel } from '../../story/investigation/actionPresentation';

import { hasFlag } from './shared';

import type { InvestigationProgressFact, InvestigationProgressNode } from './types';

export const ACT3_STAGE_LABEL: Record<AuthoredAct3Stage, string> = {
  T00: '山路旧迹', T01: '旧址入口', T02: '教室记录', T03: '禁闭区',
  T04: '档案室', T05: '广播室', T06: '厨房与空神龛', T07: '返程路线',
};

export function act3Stage(state: AppState): { location: string; objective: string; nextAction: string } {
  const stage = state.modules.act3.stage as Act3ActiveStage;
  const currentLensId = state.modules.act3.currentLensId ?? act3FirstLensId(stage);
  const lens = act3LensById(stage, currentLensId);
  const location = lens ? act3PlaceForLens(lens.id, lens.title) : ACT3_STAGE_LABEL[stage];
  const inspected = state.modules.act3.inspectedClueIds;
  const objective = act3ObjectiveFor(stage, inspected);
  if (stage === 'T07' && hasFlag(state, 'FLAG_A3_SITE_EXITED') && hasFlag(state, 'FLAG_A3_COMPLETE') && state.modules.act4.stage === 'inactive') {
    return {
      location,
      objective: '第三幕现场调查已经收束。',
      nextAction: '点击“翻开笔记，继续调查”开始阅读第四幕；也可以回看启明旧址。',
    };
  }

  const missingRequiredIds = act3RequiredClueIds(stage).filter((id) => !inspected.includes(id));
  if (missingRequiredIds.length === 0) {
    const nextAction = stage === 'T07'
      ? '按底部“与小月一起离开旧址”完成离开前的确认。'
      : `按底部“${act3StageActionLabel()}”继续调查。`;
    return { location, objective, nextAction };
  }

  const currentPendingHotspot = lens?.hotspots.find((hotspot) => missingRequiredIds.includes(hotspot.clueId));
  if (currentPendingHotspot) {
    const actionLabel = act3HotspotActionLabel(stage, currentPendingHotspot.clueId, currentPendingHotspot.label, inspected);
    return { location, objective, nextAction: `点击当前画面上的“${actionLabel}”标记查看。` };
  }

  const pathToMissingClue = missingRequiredIds
    .map((clueId) => findAct3RoutePathToClue(stage, currentLensId, clueId, inspected))
    .find((path) => path !== null);
  if (pathToMissingClue?.length) {
    const firstRoute = lens?.routes.find((route) => route.target === pathToMissingClue[0]);
    if (firstRoute && getAct3RouteAvailability(stage, lens?.id ?? null, firstRoute.target, inspected).state === 'ready') {
      return { location, objective, nextAction: `按底部“${act3RouteActionLabel(firstRoute.kind)}”按钮移动到相邻视角，再查看现场。` };
    }
  }

  const visiblePendingHotspot = lens?.hotspots.find((hotspot) => !inspected.includes(hotspot.clueId));
  if (visiblePendingHotspot) {
    const actionLabel = act3HotspotActionLabel(stage, visiblePendingHotspot.clueId, visiblePendingHotspot.label, inspected);
    return { location, objective, nextAction: `点击当前画面上的“${actionLabel}”标记查看。` };
  }

  const readyRoute = lens?.routes.find((route) => getAct3RouteAvailability(stage, lens?.id ?? null, route.target, inspected).state === 'ready');
  if (readyRoute) {
    return { location, objective, nextAction: `按底部“${act3RouteActionLabel(readyRoute.kind)}”按钮移动到相邻视角，再查看现场。` };
  }

  const blockedRoute = lens?.routes.find((route) => getAct3RouteAvailability(stage, lens.id, route.target, inspected).state === 'blocked');
  if (blockedRoute) {
    return { location, objective, nextAction: '查看底部相邻路线的阻塞说明，先完成其中要求的现场观察。' };
  }
  return {
    location,
    objective,
    nextAction: '查看当前现场已出现的观察点；完成必需核对后，可按底部按钮继续。',
  };
}


export function act3Route(state: AppState): InvestigationProgressNode[] {
  const stage = state.modules.act3.stage as AuthoredAct3Stage;
  const stageOrder = Object.keys(ACT3_STAGE_LABEL) as AuthoredAct3Stage[];
  const currentIndex = stageOrder.indexOf(stage);
  const confirmed = new Set(state.modules.act3.confirmedFlagIds);
  const nodes: InvestigationProgressNode[] = stageOrder.slice(0, currentIndex + 1).map((item, index) => {
    const evidence = ACT3_REQUIRED_EVIDENCE[item];
    const completionFlag = ACT3_STAGE_COMPLETION_FLAG[item];
    const complete = confirmed.has(completionFlag) || hasFlag(state, completionFlag);
    const current = index === currentIndex && !complete;
    return {
      id: `a3-${item}`,
      label: item === stage
        ? state.modules.act3.currentLensId
          ? act3PlaceForLens(state.modules.act3.currentLensId, act3LensById(item, state.modules.act3.currentLensId)?.title ?? ACT3_STAGE_LABEL[item])
          : ACT3_STAGE_LABEL[item]
        : ACT3_STAGE_LABEL[item],
      status: complete ? 'complete' : current ? 'current' : 'known',
      ...(complete ? { detail: `${evidence.length} 项必需材料已确认` } : {}),
    };
  });
  nodes.push({ id: 'a3-undiscovered', label: '待发现的新方向', status: 'upcoming' });
  return nodes;
}


export function act3Facts(state: AppState): InvestigationProgressFact[] {
  const inspected = new Set(state.modules.act3.inspectedClueIds);
  const facts: InvestigationProgressFact[] = [];
  const stageOrder = Object.keys(ACT3_REQUIRED_EVIDENCE) as AuthoredAct3Stage[];
  const currentIndex = stageOrder.indexOf(state.modules.act3.stage as AuthoredAct3Stage);
  for (const stage of stageOrder.slice(0, currentIndex + 1)) {
    const doc = act3StageDoc(stage);
    const hotspots = new Map(doc.lenses.flatMap((lens) => lens.hotspots.map((hotspot) => [hotspot.clueId, hotspot] as const)));
    for (const clueId of ACT3_REQUIRED_EVIDENCE[stage].map((item) => item.clueId)) {
      if (!inspected.has(clueId)) continue;
      const hotspot = hotspots.get(clueId);
      const reason = ACT3_REQUIRED_EVIDENCE[stage].find((item) => item.clueId === clueId)?.reason;
      facts.push({
        id: clueId,
        title: hotspot?.label ?? '已检视的现场材料',
        source: '第三幕现场观察 · 已检视，结论仍以阶段记录为准',
        summary: hotspot?.observation ?? reason ?? '这项观察已记录。',
        status: 'inspected',
      });
    }
  }
  return facts;
}
