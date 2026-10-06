import type { AppId, AppState, Act4Stage } from '../../core/types';

import { act1SceneHotspots } from '../sceneData';

import { act3FirstLensId, act3LensById, type AuthoredAct3Stage } from '../act3Data';

import { getAct3RouteAvailability } from '../../story/investigation/act3RoutePolicy';

import { act3RouteActionLabel } from '../../story/investigation/actionPresentation';

import { act4NarrativeSections } from '../narrative/act4Narrative';

import { act4NarrativeActionsSatisfied } from '../../story/act4/narrativePolicy';

import { hasFlag, noteFacts } from './shared';

import { act1Stage, act1Route, act1Facts } from './act1';

import { act2Stage, act2Route, act2Facts } from './act2';

import { act3Stage, act3Route, act3Facts } from './act3';

import { act4Stage, act4Route, act4Facts } from './act4';

import type { InvestigationProgressModel } from './types';

export function currentInfo(state: AppState): { act: 1 | 2 | 3 | 4; location: string; objective: string; nextAction: string; appId?: AppId } {
  if (state.modules.act4.stage !== 'inactive') return { act: 4, ...act4Stage(state) };
  if (state.modules.act3.stage !== 'inactive') return { act: 3, ...act3Stage(state) };
  if (state.modules.act2Research.stage !== 'inactive') return { act: 2, ...act2Stage(state) };
  return { act: 1, ...act1Stage(state) };
}


export function pendingDirections(state: AppState, act: 1 | 2 | 3 | 4, finished: boolean): string[] {
  if (finished) return ['如需回看，可在已完成内容中查找；新线索仍待发现。'];

  if (act === 1) {
    const sceneId = state.modules.scene.currentSceneId;
    if (!sceneId) return ['后续内容尚未展开；继续完成当前步骤即可。'];
    const remaining = act1SceneHotspots.filter((item) => item.sceneId === sceneId && !state.modules.scene.inspectedHotspotIds.includes(item.id)).length;
    return remaining
      ? [`当前画面还有 ${remaining} 处已出现的线索标记可检查。`]
      : ['当前画面已出现的线索都看过了；按底部提示继续。'];
  }

  if (act === 2 && state.modules.act2Research.stage === 'qiming') {
    const visited = new Set(state.modules.browser.visitedPageIds);
    const reviewed = new Set(state.modules.act2Research.t06.reviewedCases.map((item) => item.caseId));
    const knownFollowups = (['huang', 'zhong'] as const).filter((person) => visited.has(person === 'huang' ? 'PAGE_A2_T06_008' : 'PAGE_A2_T06_009') && !reviewed.has(person));
    if (knownFollowups.length) return [`已打开的后续报道中还有 ${knownFollowups.map((person) => person === 'huang' ? '黄子山' : '钟子月').join('、')} 材料待核对并记录。`];
    if (visited.has('PAGE_A2_T06_004') && reviewed.size < 2) return ['宣传原文已经出现；可选择一位已经公开出现的人物，打开其后续报道并记录差异。'];
    return ['从已经出现的启明公开来源中继续核对；尚未出现的人物与后续材料不列在这里。'];
  }

  if (act === 2) {
    const stage = state.modules.act2Research.stage;
    if (stage === 'search' && hasFlag(state, 'FLAG_A2_OFFLINE_RESEARCH_NEEDED')) return ['搜索结果没有回答问题；浏览器里已经出现“去桥头问问当地人”的入口。'];
    if (stage === 'bridge' && hasFlag(state, 'FLAG_A2_COUNTY_RECORD_HINT_KNOWN')) return ['桥头已经出现地名辨认的后续操作；完成后可前往县图书馆。'];
    if (stage === 'library' && hasFlag(state, 'FLAG_A2_BUMU_RULE_BASIC_KNOWN')) return ['地方志目标页已摘录；底部已出现继续对照三篇志异的入口。'];
    if (stage === 'tales' && hasFlag(state, 'FLAG_A2_TRANSFER_RULE_INFERRED')) return ['暂定判断已记录；页面已出现前往高中调查的入口。'];
    if (stage === 'school' && hasFlag(state, 'FLAG_A2_SS_MATCH_CONFIRMED')) return ['新旧记号已核对；页面已出现前往浏览器核查启明的入口。'];
    if (stage === 'finale' && hasFlag(state, 'FLAG_A2_SECOND_TRIP_PLANNED')) return ['第二次进山已商定；页面已出现“再次进山，调查启明旧址”的入口。'];
  }

  if (act === 3) {
    const stage = state.modules.act3.stage as AuthoredAct3Stage;
    const lensId = state.modules.act3.currentLensId ?? act3FirstLensId(stage);
    const lens = act3LensById(stage, lensId);
    const inspected = state.modules.act3.inspectedClueIds;
    const directions: string[] = [];
    const remainingHere = lens?.hotspots.filter((hotspot) => !inspected.includes(hotspot.clueId)).length ?? 0;
    if (remainingHere) directions.push(`当前位置还有 ${remainingHere} 处已出现的观察点可查看。`);
    const availableRoutes = lens?.routes.filter((route) => getAct3RouteAvailability(stage, lensId, route.target, inspected).state === 'ready') ?? [];
    const routeLabels = [...new Set(availableRoutes.map((route) => act3RouteActionLabel(route.kind)))];
    for (const routeLabel of routeLabels) directions.push(`按“${routeLabel}”移动到已出现的相邻视角。`);
    return directions.length ? directions : ['当前没有新的已知观察方向；按页面提示完成必需核对。'];
  }

  if (act === 4) {
    const stage = state.modules.act4.stage as Exclude<Act4Stage, 'inactive'>;
    const section = act4NarrativeSections.find((item) => item.stage === stage);
    const sectionRead = state.modules.act4.completedNarrativeSectionIds.includes(section?.id ?? '');
    const actionSatisfied = act4NarrativeActionsSatisfied(stage, state.modules.act4.completedNarrativeActionIds);
    if (!sectionRead && !actionSatisfied) return [`当前篇章的指定动作尚未完成：${act4Stage(state).nextAction}`];
    if (!sectionRead) return ['当前篇章动作已满足；翻开这一段，按页往下读。'];
    return stage === 'T03' ? ['当前动态已读完；按页面提示继续。'] : ['当前篇章已读完；按页面提示继续。'];
  }

  return ['后续内容尚未展开；继续完成当前步骤即可。'];
}

export function deriveInvestigationProgress(state: AppState): InvestigationProgressModel {
  const current = currentInfo(state);
  const actLabel = `第${['', '一', '二', '三', '四'][current.act]}幕`;
  const route = current.act === 1 ? act1Route(state)
    : current.act === 2 ? act2Route(state)
      : current.act === 3 ? act3Route(state)
        : act4Route(state);
  const facts = current.act === 1 ? act1Facts(state)
    : current.act === 2 ? act2Facts(state)
      : current.act === 3 ? act3Facts(state)
        : act4Facts(state);
  const priorNotes = noteFacts(state, current.act);
  const knownFacts = [...priorNotes, ...facts]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
  const finished = current.act === 1 ? hasFlag(state, 'FLAG_A1_COMPLETE')
    : current.act === 2 ? hasFlag(state, 'FLAG_A2_COMPLETE')
      : current.act === 3 ? hasFlag(state, 'FLAG_A3_COMPLETE')
        : hasFlag(state, 'FLAG_A4_COMPLETE');
  return {
    act: current.act,
    actLabel,
    location: current.location,
    currentObjective: current.objective,
    nextAction: current.nextAction,
    ...(current.appId ? { nextActionAppId: current.appId } : {}),
    route,
    knownFacts,
    pendingDirections: pendingDirections(state, current.act, finished),
  };
}
