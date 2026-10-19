import type { AppId, AppState } from '../../core/types';

import { act1SceneHotspots, sceneById } from '../sceneData';

import { browserPageById } from '../browserData';

import { mailById } from '../mailData';

import { getCurrentTaskGuide } from '../taskGuideData';

import { hasFlag, pageFact } from './shared';

import type { InvestigationProgressFact, InvestigationProgressNode } from './types';

export function act1Stage(state: AppState): { location: string; objective: string; nextAction: string; appId?: AppId } {
  const scene = state.modules.scene.currentSceneId ? sceneById.get(state.modules.scene.currentSceneId) : undefined;
  if (scene) return {
    location: scene.title,
    objective: scene.description,
    nextAction: '点击当前画面里已出现的线索标记阅读观察；满足底部提示后，按“继续”前往下一处。',
  };
  if (state.game.flags.FLAG_A1_COMPLETE === true) return {
    location: '第一幕收尾',
    objective: '第一幕线索已经整理完成。',
    nextAction: '在收尾页点击“回到桌面，继续调查”。',
  };
  if (state.game.phase === 'F' && !state.modules.scene.journeyStarted) return {
    location: '前往鸡公岭',
    objective: '已到出发提示页。',
    nextAction: '资料仍可查阅；准备好后点击“整理线索 / 准备出发”，再确认“前往鸡公岭”。',
  };
  const guide = getCurrentTaskGuide(state);
  if (guide) {
    const current = guide.steps.find((step) => step.current) ?? guide.steps.find((step) => !step.complete);
    return {
      location: guide.summary,
      objective: guide.summary,
      nextAction: current ? [current.label, current.hint].filter(Boolean).join(' ') : guide.summary,
      ...(current?.appId ? { appId: current.appId } : guide.actionAppId ? { appId: guide.actionAppId } : {}),
    };
  }
  return {
    location: '第一幕调查',
    objective: '从桌面当前提示继续已出现的线索。',
    nextAction: '打开桌面上的“当前步骤”提示，按其中的应用与材料名称操作。',
  };
}


export function act1Route(state: AppState): InvestigationProgressNode[] {
  const nodes: InvestigationProgressNode[] = [];
  if (hasFlag(state, 'FLAG_A1_XIAOA_MISSING_KNOWN')) nodes.push({ id: 'a1-wechat', label: '微信消息', status: 'complete', detail: '母亲的新消息已读' });
  if (hasFlag(state, 'FLAG_A1_MAIL_XIAOA_OPENED')) nodes.push({ id: 'a1-mail', label: '小 A 的旧邮件', status: 'complete', detail: '邮件已打开' });
  if (hasFlag(state, 'FLAG_A1_NEWS_FOUND') || hasFlag(state, 'FLAG_A1_ROUTE_INFO_FOUND')) nodes.push({ id: 'a1-web', label: '失踪与路线网页', status: 'complete', detail: '至少一份网页资料已读' });
  if (state.modules.scene.visitedSceneIds.length || state.modules.scene.journeyStarted) {
    const current = state.modules.scene.currentSceneId ? sceneById.get(state.modules.scene.currentSceneId) : undefined;
    nodes.push({ id: 'a1-field', label: current?.title ?? '鸡公岭现场', status: current ? 'current' : 'known' });
  }
  if (state.modules.scene.capturedPhotoIds.length || hasFlag(state, 'FLAG_A1_SS_FOUND')) nodes.push({ id: 'a1-photo', label: '现场照片', status: hasFlag(state, 'FLAG_A1_SS_FOUND') ? 'complete' : 'known', detail: hasFlag(state, 'FLAG_A1_SS_FOUND') ? '照片线索已确认' : '照片已拍摄，线索仍待核对' });
  if (!nodes.length) nodes.push({ id: 'a1-current', label: '第一幕调查', status: 'current' });
  return [...nodes, { id: 'a1-undiscovered', label: '待发现的新方向', status: 'upcoming' }];
}


export function act1Facts(state: AppState): InvestigationProgressFact[] {
  const facts: InvestigationProgressFact[] = [];
  for (const entryId of state.modules.mail.readIds) {
    const mail = mailById.get(entryId);
    if (mail && mail.act === 1) facts.push({ id: mail.id, title: mail.subject, source: `邮箱原文 · ${mail.fromName} · ${mail.sentAt}`, summary: mail.preview, status: 'read' });
  }
  for (const pageId of state.modules.browser.visitedPageIds) {
    const page = browserPageById.get(pageId);
    if (page?.act === 1) {
      const fact = pageFact(pageId);
      if (fact) facts.push(fact);
    }
  }
  for (const hotspotId of state.modules.scene.inspectedHotspotIds) {
    const hotspot = act1SceneHotspots.find((item) => item.id === hotspotId);
    if (hotspot) facts.push({ id: hotspot.id, title: hotspot.label, source: '鸡公岭现场观察', summary: hotspot.observation, status: 'inspected' });
  }
  return facts;
}
