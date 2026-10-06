import type { AppState } from '../../core/types';

import { getAutoEntries } from '../noteData';

import { browserPageById } from '../browserData';

import type { InvestigationProgressFact } from './types';

export const hasFlag = (state: AppState, flagId: string): boolean => state.game.flags[flagId] === true;

export const pageFact = (pageId: string, status: InvestigationProgressFact['status'] = 'read'): InvestigationProgressFact | null => {
  const page = browserPageById.get(pageId);
  if (!page) return null;
  const kind = page.phase === 'A2_T06'
    ? page.pageType === 'forum' ? '论坛发言（身份未核实）' : page.pageType === 'news' ? '地方旧闻转述' : '机构公开资料'
    : '网页原文';
  return {
    id: page.id,
    title: page.headline,
    source: `${kind} · ${page.domain} · ${page.publishedAt}`,
    summary: page.snippet,
    status,
  };
};

export const noteFacts = (state: AppState, act: number): InvestigationProgressFact[] => getAutoEntries(state.modules.notepad)
  .filter((entry) => entry.act <= act)
  .map((entry) => ({
    id: entry.id,
    title: entry.title,
    source: entry.source,
    summary: entry.content,
    status: 'noted' as const,
  }));
