import type { AppId, AppState } from '../../core/types';

import { getCurrentTaskGuide } from '../taskGuideData';

import { hasFlag } from './shared';

import { act1Route } from './act1';

import { act2Route } from './act2';

import { act3Route } from './act3';

import { act4Route } from './act4';

import { currentInfo } from './model';

import type { DesktopTaskPresentation, DesktopTaskStep } from './types';

const appLabel: Record<AppId, string> = {
  wechat: '打开微信', mail: '打开邮箱', browser: '打开浏览器', explorer: '打开资源管理器', notepad: '打开调查', photos: '打开照片',
};

export function t06DesktopSteps(state: AppState): DesktopTaskStep[] {
  const visited = new Set(state.modules.browser.visitedPageIds);
  const reviewed = new Set(state.modules.act2Research.t06.reviewedCases.map((item) => item.caseId));
  if (state.modules.act2Research.t06.legacyCompletionMigrated || (reviewed.has('huang') && reviewed.has('zhong'))) {
    return [{ id: 't06-continue', label: '在浏览器个案复核区点击“与小月继续核对资料”进入宣传资料核对', complete: false, current: true, appId: 'browser' }];
  }
  const steps: DesktopTaskStep[] = [];
  const officialRead = visited.has('PAGE_A2_T06_004');
  steps.push({ id: 't06-official', label: '打开启明旧站学员成长记录，查看宣传原文', complete: officialRead, current: false, appId: 'browser' });
  const knownCases: readonly { id: 'huang' | 'zhong'; label: string; pageId: string }[] = [
    { id: 'huang', label: '核对黄子山的后续报道并记录材料差异', pageId: 'PAGE_A2_T06_008' },
    { id: 'zhong', label: '核对钟子月的后续报道并记录材料差异', pageId: 'PAGE_A2_T06_009' },
  ];
  const revealed = knownCases.filter((item) => officialRead || visited.has(item.pageId) || reviewed.has(item.id));
  if (revealed.length === 0 && !officialRead) {
    steps.push({ id: 't06-case', label: '从已出现的来源中选择一位人物，打开其后续报道并记录材料差异', complete: false, current: true, appId: 'browser' });
  } else {
    for (const person of revealed) steps.push({
      id: `t06-${person.id}`,
      label: person.label,
      complete: reviewed.has(person.id),
      current: false,
      appId: 'browser',
    });
  }
  const current = steps.findIndex((item) => !item.complete);
  if (current >= 0) steps[current] = { ...steps[current], current: true };
  return steps;
}

export function t07DesktopSteps(state: AppState): DesktopTaskStep[] {
  const flags = state.game.flags;
  const steps: DesktopTaskStep[] = [
    { id: 't07-photo', label: '和小月查看校门合影，核对照片中的双 S', complete: flags.FLAG_A2_PROMO_PHOTO_SS_FOUND === true, current: false },
    { id: 't07-video', label: '打开受访视频，找到可比对的画面；不必完整播放', complete: flags.FLAG_A2_PROMO_VIDEO_FOUND === true, current: false },
    { id: 't07-compare', label: '截取清晰画面，与第一次徒步拍下的破庙外景并排比对', complete: flags.FLAG_A2_TEMPLE_FRAME_FOUND === true, current: false },
    { id: 't07-location', label: '记录材料能够支持的地点结论', complete: flags.FLAG_A2_QIMING_LOCATION_INFERRED === true, current: false },
    { id: 't07-trip', label: '和小月商量是否安排第二次进山', complete: flags.FLAG_A2_SECOND_TRIP_PLANNED === true, current: false },
  ];
  const current = steps.findIndex((item) => !item.complete);
  if (current >= 0) steps[current] = { ...steps[current], current: true };
  return steps;
}

export function currentStageTaskPresentation(state: AppState): DesktopTaskPresentation {
  const current = currentInfo(state);
  const route = current.act === 1 ? act1Route(state)
    : current.act === 2 ? act2Route(state)
      : current.act === 3 ? act3Route(state)
        : act4Route(state);
  const terminalAct4 = current.act === 4 && hasFlag(state, 'FLAG_A4_COMPLETE');
  const visibleRouteCount = route.filter((node) => node.status !== 'upcoming').length;
  const completedCount = terminalAct4 ? visibleRouteCount : route.filter((node) => node.status === 'complete').length;
  return {
    title: '当前步骤',
    summary: current.objective,
    completedCount,
    totalCount: terminalAct4 ? visibleRouteCount : Math.max(completedCount + 1, route.length - 1),
    steps: terminalAct4 ? [] : [{ id: 'current-action', label: current.nextAction, complete: false, current: true, ...(current.appId ? { appId: current.appId } : {}) }],
    nextAction: current.nextAction,
    ...(current.appId ? { actionAppId: current.appId, actionLabel: appLabel[current.appId] } : {}),
  };
}

export function getDesktopTaskPresentation(state: AppState): DesktopTaskPresentation {
  const guide = getCurrentTaskGuide(state);
  if (state.modules.act4.stage !== 'inactive' || state.modules.act3.stage !== 'inactive') {
    return currentStageTaskPresentation(state);
  }
  if (state.modules.act2Research.stage === 'qiming') {
    const steps = t06DesktopSteps(state);
    const current = steps.find((step) => step.current) ?? steps.find((step) => !step.complete);
    return {
      title: '当前步骤',
      summary: '继续核对启明公开资料与已经出现的实名后续。',
      completedCount: steps.filter((step) => step.complete).length,
      totalCount: steps.length,
      steps,
      nextAction: current?.label ?? '两个人物的材料都已记录，可继续核对宣传资料。',
      actionAppId: 'browser',
      actionLabel: appLabel.browser,
    };
  }
  if (state.modules.act2Research.stage === 'finale') {
    const steps = t07DesktopSteps(state);
    if (state.game.flags.FLAG_A2_SECOND_TRIP_PLANNED === true && state.modules.act3.stage === 'inactive') {
      steps.push({ id: 't07-enter-act3', label: '点击“再次进山，调查启明旧址”开始现场调查', complete: false, current: true });
    }
    const current = steps.find((step) => step.current) ?? steps.find((step) => !step.complete) ?? steps[steps.length - 1];
    return {
      title: '当前步骤',
      summary: '和小月核对已读宣传资料与现场照片。',
      completedCount: steps.filter((step) => step.complete).length,
      totalCount: steps.length,
      steps,
      nextAction: current.label,
    };
  }
  if (guide) {
    const steps = [...guide.steps];
    const currentIndex = steps.findIndex((step) => step.current);
    const lastVisible = currentIndex >= 0 ? currentIndex : steps.findIndex((step) => !step.complete);
    const visible = lastVisible >= 0 ? steps.slice(0, lastVisible + 1) : steps;
    const current = visible.find((step) => step.current) ?? visible.find((step) => !step.complete);
    return {
      title: '当前步骤',
      summary: guide.summary,
      completedCount: visible.filter((step) => step.complete).length,
      totalCount: visible.length,
      steps: visible.map((step, index) => ({ ...step, id: `${guide.id}-${index}` })),
      nextAction: current ? [current.label, current.hint].filter(Boolean).join(' ') : guide.summary,
      ...(current?.appId ? { actionAppId: current.appId, actionLabel: appLabel[current.appId] } : {}),
    };
  }
  return currentStageTaskPresentation(state);
}
