import type { AppState, Act4Stage } from '../../core/types';

import { act4NarrativeSections } from '../narrative/act4Narrative';

import { act4NarrativeActionsSatisfied, act4NarrativeRequiredActions } from '../../story/act4/narrativePolicy';

import { hasFlag } from './shared';

import type { InvestigationProgressFact, InvestigationProgressNode } from './types';

export type Act4NarrativeSection = (typeof act4NarrativeSections)[number];

export function act4SectionTitleForDisplay(section: Act4NarrativeSection, isComplete: boolean): string {
  return section.stage === 'T05' && !isComplete ? '王澳的 2014 年亲历' : section.title;
}

export function act4SectionPeriodForDisplay(section: Act4NarrativeSection, isComplete: boolean): string {
  return section.stage === 'T05' && !isComplete ? '2014 年' : section.periodLabel;
}

export function act4Stage(state: AppState): { location: string; objective: string; nextAction: string } {
  const stage = state.modules.act4.stage as Exclude<Act4Stage, 'inactive'>;
  if (hasFlag(state, 'FLAG_A4_COMPLETE')) return {
    location: '第四幕调查完成',
    objective: '第四幕已经完成。',
    nextAction: '可在调查进度中回顾已读篇章和已记录的事实。',
  };
  const section = act4NarrativeSections.find((item) => item.stage === stage);
  const actions = state.modules.act4.completedNarrativeActionIds;
  const pageReadingAction = '翻开这一段，按页往下读；读完后继续。';
  const actionSteps: Partial<Record<Exclude<Act4Stage, 'inactive'>, string>> = {
    T01: pageReadingAction,
    T02: actions.includes('A4_T02_LOGIN_SUCCEEDED') ? pageReadingAction : '对照两封旧邮件日期，输入八位数登录账号。',
    T03: '打开王澳的动态，按日期阅读；读到末尾后继续。',
    T04: actions.includes('A4_T04_WAKE_MAIL_OPENED') ? pageReadingAction : '找到并打开已出现的 VVaKe 邮件，随后按页阅读。',
    T05: pageReadingAction,
    T06: pageReadingAction,
    T07: pageReadingAction,
    T08: actions.includes('A4_T08_ARCHIVE_OPENED') ? pageReadingAction : '选择并打开当前页面提供的档案，再按页阅读。',
    T09: !actions.includes('A4_T09_NOTE_HIDDEN') ? '读到便签段落后，按页面动作把笔记藏好。' : !actions.includes('A4_T09_DOOR_EXITED') ? '按页面动作继续走向门外，明确完成离开。' : pageReadingAction,
    T10: actions.includes('A4_T10_FINAL_MAIL_OPENED') ? pageReadingAction : '读到邮件入口后，打开启明的最后一封邮件。',
  };
  const perspective = section?.perspective === 'wangao' ? '王澳亲历' : '调查者阅读';
  const sectionComplete = Boolean(section && state.modules.act4.completedNarrativeSectionIds.includes(section.id));
  const displayTitle = section ? act4SectionTitleForDisplay(section, sectionComplete) : '第四幕当前篇章';
  const displayPeriod = section ? act4SectionPeriodForDisplay(section, sectionComplete) : '';
  const period = displayPeriod ? ` · ${displayPeriod}` : '';
  const objective = stage === 'T05' && !sectionComplete
    ? '王澳亲历 · 2014 年。当前篇章仍在阅读。'
    : `${perspective}${period}。${displayTitle}`.trim();
  return {
    location: displayTitle,
    objective,
    nextAction: actionSteps[stage] ?? '点击“继续阅读”阅读当前篇章，并完成页面上明确要求的操作。',
  };
}


export function act4Route(state: AppState): InvestigationProgressNode[] {
  const completed = new Set(state.modules.act4.completedNarrativeSectionIds);
  const currentStage = state.modules.act4.stage as Exclude<Act4Stage, 'inactive'>;
  const currentIndex = act4NarrativeSections.findIndex((section) => section.stage === currentStage);
  const visible = act4NarrativeSections.slice(0, currentIndex + 1).filter((section) => completed.has(section.id) || section.stage === currentStage);
  const nodes: InvestigationProgressNode[] = visible.map((section) => {
    const isComplete = completed.has(section.id);
    const actionSatisfied = act4NarrativeActionsSatisfied(section.stage, state.modules.act4.completedNarrativeActionIds);
    const current = section.stage === currentStage && !isComplete;
    const perspective = section.perspective === 'wangao' ? '王澳亲历' : '调查者阅读';
    const displayTitle = act4SectionTitleForDisplay(section, isComplete);
    const displayPeriod = act4SectionPeriodForDisplay(section, isComplete);
    const detail = isComplete
      ? `${perspective} · 正文已读${act4NarrativeRequiredActions[section.stage]?.some((action) => !state.modules.act4.completedNarrativeActionIds.includes(action)) ? '，相关动作仍待核对' : ''}`
      : section.stage === currentStage
        ? `${perspective}${section.stage === 'T05' ? ` · ${displayPeriod}` : ''} · ${actionSatisfied ? '当前动作已完成，正文尚未收好' : '当前阅读与操作'}`
        : undefined;
    return {
      id: section.id,
      label: displayTitle,
      status: isComplete ? 'complete' as const : current ? 'current' as const : 'known' as const,
      ...(detail ? { detail } : {}),
    };
  });
  if (currentStage !== 'T10' || state.game.flags.FLAG_A4_COMPLETE !== true) {
    nodes.push({ id: 'a4-undiscovered', label: '后续内容待发现', status: 'upcoming' });
  }
  return nodes;
}


export function act4Facts(state: AppState): InvestigationProgressFact[] {
  const completed = new Set(state.modules.act4.completedNarrativeSectionIds);
  const currentIndex = act4NarrativeSections.findIndex((section) => section.stage === state.modules.act4.stage);
  return act4NarrativeSections.slice(0, currentIndex + 1).flatMap((section) => {
    if (!completed.has(section.id)) return [];
    const firstBlock = section.blocks[0];
    const firstParagraph = firstBlock?.paragraphs[0];
    const source = section.perspective === 'wangao' ? '王澳亲历原文' : '调查者视角原文';
    return [{
      id: section.id,
      title: section.title,
      source: `${source} · ${section.periodLabel}`,
      summary: firstParagraph ?? '这一篇章已读完。',
      status: 'read' as const,
    }];
  });
}
