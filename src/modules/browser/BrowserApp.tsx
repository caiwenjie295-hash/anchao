import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { EvidenceImage } from '../../components/EvidenceImage';
import { stateManager, type StateManager } from '../../core/stateManager';
import { browserPageById, findSearchQuery, getResultsForQuery, getSuggestions, isAct2T06Query, isAct2T06Record, isBrowserPageVisible, type BrowserPage, type BrowserPageInteraction } from '../../data/browserData';

type View = { kind: 'home' } | { kind: 'results'; query: string } | { kind: 'page'; pageId: string };
type Tab = { id: number; view: View; stack: View[]; stackIndex: number };
const viewLabel = (view: View): string => view.kind === 'home' ? '新标签页' : view.kind === 'results' ? view.query : browserPageById.get(view.pageId)?.headline ?? '页面';
const searchView = (query: string): View => ({ kind: 'results', query: findSearchQuery(query)?.query ?? query.trim() });

export function BrowserApp({ manager = stateManager }: { manager?: StateManager }) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const [tabs, setTabs] = useState<Tab[]>([{ id: 1, view: { kind: 'home' }, stack: [{ kind: 'home' }], stackIndex: 0 }]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [draft, setDraft] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const stage = state.modules.act2Research.stage;
  const safeDraft = draft;
  const suggestions = useMemo(() => getSuggestions(isAct2T06Query(draft) && stage !== 'qiming' ? '' : draft, stage), [draft, stage]);
  const visibleView = (view: View): View => {
    if (view.kind === 'results' && findSearchQuery(view.query) && isAct2T06Record(findSearchQuery(view.query)!) && stage !== 'qiming') return { kind: 'home' };
    if (view.kind === 'page' && !isBrowserPageVisible(browserPageById.get(view.pageId), stage)) return { kind: 'home' };
    return view;
  };
  const shownView = visibleView(activeTab.view);
  useEffect(() => {
    if (stage === 'qiming') return;
    setDraft(''); setHistoryOpen(false);
    setTabs((current) => current.map((tab) => {
      const stack = tab.stack.filter((view) => visibleView(view).kind !== 'home' || view.kind === 'home');
      const nextStack = stack.length ? stack : [{ kind: 'home' as const }];
      const safeView = visibleView(tab.view);
      const stackIndex = Math.max(0, nextStack.findIndex((view) => JSON.stringify(view) === JSON.stringify(safeView)));
      return { ...tab, view: safeView, stack: nextStack, stackIndex };
    }));
  }, [stage]);
  const replaceActive = (nextView: View, push = true) => setTabs((current) => current.map((tab) => {
    if (tab.id !== activeTabId) return tab;
    const stack = push ? [...tab.stack.slice(0, tab.stackIndex + 1), nextView] : tab.stack;
    return { ...tab, view: nextView, stack, stackIndex: push ? stack.length - 1 : tab.stackIndex };
  }));
  const submitSearch = (value = draft) => {
    if (!value.trim()) return;
    const view = searchView(value);
    const definition = findSearchQuery(value);
    if (definition && isAct2T06Record(definition) && stage === 'school') manager.enterAct2QimingResearch();
    const currentStage = manager.getState().modules.act2Research.stage;
    if (definition && isAct2T06Record(definition) && currentStage !== 'qiming') return;
    const finalView = searchView(value);
    manager.recordBrowserSearch(view.kind === 'results' ? view.query : value);
    replaceActive(finalView);
    setDraft(finalView.kind === 'results' ? finalView.query : value);
    setHistoryOpen(false);
  };
  const openPage = (pageId: string) => {
    manager.recordBrowserPageVisit(pageId);
    replaceActive({ kind: 'page', pageId });
    setHistoryOpen(false);
  };
  const navigate = (direction: -1 | 1) => {
    const nextIndex = activeTab.stackIndex + direction;
    if (nextIndex < 0 || nextIndex >= activeTab.stack.length) return;
    const nextView = visibleView(activeTab.stack[nextIndex]);
    setTabs((current) => current.map((tab) => tab.id === activeTabId ? { ...tab, view: nextView, stackIndex: nextIndex } : tab));
    if (nextView.kind === 'page') manager.recordBrowserPageVisit(nextView.pageId);
  };
  const newTab = () => {
    const id = Math.max(...tabs.map((tab) => tab.id)) + 1;
    setTabs((current) => [...current, { id, view: { kind: 'home' }, stack: [{ kind: 'home' }], stackIndex: 0 }]);
    setActiveTabId(id);
    setDraft('');
  };
  const closeTab = (id: number) => {
    if (tabs.length === 1) return replaceActive({ kind: 'home' });
    const next = tabs.filter((tab) => tab.id !== id);
    setTabs(next);
    if (id === activeTabId) setActiveTabId(next.at(-1)?.id ?? 1);
  };
  const addressValue = safeDraft || (shownView.kind === 'page' ? browserPageById.get(shownView.pageId)?.url ?? '' : shownView.kind === 'results' ? shownView.query : '');
  return <section className="browser-app" aria-label="内部浏览器">
    <div className="browser-tabs" aria-label="浏览器标签页">
      <div className="browser-tabs__scroll">{tabs.map((tab) => { const tabView = visibleView(tab.view); return <div key={tab.id} className={`browser-tab${tab.id === activeTabId ? ' browser-tab--active' : ''}`}><button type="button" className="browser-tab__select" onClick={() => { setActiveTabId(tab.id); setDraft(''); }} aria-current={tab.id === activeTabId ? 'page' : undefined}>{viewLabel(tabView)}</button><button type="button" className="browser-tab__close" onClick={() => closeTab(tab.id)} aria-label={`关闭 ${viewLabel(tabView)}`}>×</button></div>; })}</div>
      <button type="button" className="browser-new-tab" onClick={newTab} aria-label="新建标签页">＋</button>
    </div>
    <header className="browser-toolbar">
      <div className="browser-toolbar__nav"><button type="button" onClick={() => navigate(-1)} disabled={activeTab.stackIndex === 0} aria-label="后退">←</button><button type="button" onClick={() => navigate(1)} disabled={activeTab.stackIndex === activeTab.stack.length - 1} aria-label="前进">→</button></div>
      <form className="browser-address" onSubmit={(event) => { event.preventDefault(); submitSearch((event.currentTarget.querySelector('input') as HTMLInputElement).value); }}><label className="sr-only" htmlFor="browser-search">搜索内部网页</label><span aria-hidden="true">⌕</span><input id="browser-search" value={addressValue} onChange={(event) => setDraft(event.target.value)} onFocus={() => setDraft(addressValue)} placeholder="搜索或输入内部地址" autoComplete="off" /></form>
      <button type="button" className="browser-history-button" onClick={() => setHistoryOpen((open) => !open)} aria-expanded={historyOpen} aria-label="查看搜索历史">◷ <span>历史</span></button>
    </header>
    {historyOpen && <aside className="browser-history" aria-label="搜索历史"><strong>最近搜索</strong>{state.modules.browser.queryHistory.filter((query) => stage === 'qiming' || !findSearchQuery(query) || !isAct2T06Record(findSearchQuery(query)!)).length ? state.modules.browser.queryHistory.filter((query) => stage === 'qiming' || !findSearchQuery(query) || !isAct2T06Record(findSearchQuery(query)!)).map((query) => <button type="button" key={query} onClick={() => submitSearch(query)}>{query}</button>) : <p>还没有搜索记录</p>}</aside>}
    <div className="browser-content">
      {shownView.kind === 'home' && <BrowserHome draft={safeDraft} suggestions={suggestions} onChoose={(query) => { setDraft(query); submitSearch(query); }} />}
      {shownView.kind === 'results' && <SearchResults query={shownView.query} stage={stage} onOpen={openPage} />}
      {shownView.kind === 'page' && <BrowserPageView page={browserPageById.get(shownView.pageId)} manager={manager} />}
    </div>
  </section>;
}

function BrowserHome({ draft, suggestions, onChoose }: { draft: string; suggestions: string[]; onChoose: (query: string) => void }) {
  return <section className="browser-home"><div><p className="browser-home__eyebrow">本机内部索引</p><h2>查找一些旧信息</h2><p>结果来自这台电脑保存的离线网页索引。</p>{draft && <div className="browser-suggestions" aria-label="搜索建议">{suggestions.map((term) => <button type="button" key={term} onClick={() => onChoose(term)}>{term}</button>)}</div>}</div></section>;
}
function SearchResults({ query, stage, onOpen }: { query: string; stage: import('../../core/types').Act2Stage; onOpen: (pageId: string) => void }) {
  const results = getResultsForQuery(query, stage);
  return <section className="browser-results" aria-live="polite"><header><p>内部搜索</p><h2>{query}</h2><span>{results.length ? `约 ${results.length} 条结果` : '没有完全匹配的结果'}</span></header>{results.length ? <ol>{results.map((page) => <li key={page.id}><button type="button" onClick={() => onOpen(page.id)}><span className="browser-result__domain">{page.domain}</span><strong>{page.headline}</strong><span>{page.publishedAt} · {page.snippet}</span></button></li>)}</ol> : <p className="browser-empty">试试“鸡公岭”“XX县失踪”或其他搜索建议。</p>}</section>;
}
export function BrowserPageView({ page, manager }: { page: BrowserPage | undefined; manager: StateManager }) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const visited = manager.getState().modules.browser.visitedPageIds;
  if (!page) return <p className="browser-empty">该内部页面已不可用。</p>;
  const interactions = (page.interactions ?? []).filter((interaction) => (
    ('requiredVisitedPageIds' in interaction ? interaction.requiredVisitedPageIds.every((id) => visited.includes(id)) : true)
    && ('requiredFlags' in interaction ? interaction.requiredFlags.every((id) => manager.getState().game.flags[id] === true) : true)
  ));
  const copyName = async (interaction: Extract<BrowserPageInteraction, { type: 'copy-names' }>, name: string) => {
    try {
      await navigator.clipboard.writeText(name);
      setCopyStatus(interaction.successMessage.replaceAll('{name}', name));
    } catch {
      setCopyStatus(interaction.failureMessage.replaceAll('{name}', name));
    }
  };
  const runInteraction = (interaction: BrowserPageInteraction) => {
    if (interaction.type === 'qiming-name-match') manager.inferAct2QimingNameMatch(interaction.person);
    if (interaction.type === 'confirm-other-cases') manager.confirmAct2OtherCasesAbnormal();
  };
  return <article className="browser-page"><p className="browser-page__source">{page.domain} · {page.publishedAt}</p><h2>{page.headline}</h2><p className="browser-page__url">{page.url}</p><div>{page.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>{interactions.map((interaction, index) => <div className="browser-page__actions" key={`${page.id}-interaction-${index}`}><p>{interaction.prompt}</p>{interaction.type === 'copy-names' ? <>{copyStatus && <p role="status">{copyStatus}</p>}{interaction.names.map((name) => <button type="button" key={name.value} onClick={() => void copyName(interaction, name.value)}>{name.buttonLabel}</button>)}</> : <button type="button" onClick={() => runInteraction(interaction)}>{interaction.buttonLabel}</button>}</div>)}{page.images?.map((picture) => <figure key={picture.assetId}><EvidenceImage assetId={picture.assetId} caption={picture.caption} /><figcaption>{picture.caption}</figcaption></figure>)}</article>;
}
