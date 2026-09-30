import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { stateManager, type StateManager } from '../../core/stateManager';
import { browserPageById, findSearchQuery, getSuggestions, isAct2T06Query, isAct2T06Record, isBrowserPageVisible } from '../../data/browserData';
import { BrowserPageView } from './BrowserPageView';
import { BrowserSearchResults } from './BrowserSearchResults';
import './browserApp.css';

/** 页面版式已拆到独立组件，这里保留既有导出路径。 */
export { BrowserPageView } from './BrowserPageView';

type View = { kind: 'home' } | { kind: 'results'; query: string } | { kind: 'page'; pageId: string };
type Tab = { id: number; view: View; stack: View[]; stackIndex: number };
const viewLabel = (view: View): string => view.kind === 'home' ? '新标签页' : view.kind === 'results' ? view.query : browserPageById.get(view.pageId)?.headline ?? '页面';
const searchView = (query: string): View => ({ kind: 'results', query: findSearchQuery(query)?.query ?? query.trim() });

export function BrowserApp({ manager = stateManager }: { manager?: StateManager }) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const [tabs, setTabs] = useState<Tab[]>([{ id: 1, view: { kind: 'home' }, stack: [{ kind: 'home' }], stackIndex: 0 }]);
  const [activeTabId, setActiveTabId] = useState(1);
  // null means the address follows the active page; '' is an intentional empty edit.
  const [draft, setDraft] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [qimingView, setQimingView] = useState<'review' | 'browser'>('review');
  const qimingWorkspaceRef = useRef<HTMLDivElement>(null);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const stage = state.modules.act2Research.stage;
  const safeDraft = draft ?? '';
  const suggestions = useMemo(() => getSuggestions(isAct2T06Query(safeDraft) && stage !== 'qiming' ? '' : safeDraft, stage), [safeDraft, stage]);
  const visibleView = (view: View): View => {
    if (view.kind === 'results' && findSearchQuery(view.query) && isAct2T06Record(findSearchQuery(view.query)!) && stage !== 'qiming') return { kind: 'home' };
    if (view.kind === 'page' && !isBrowserPageVisible(browserPageById.get(view.pageId), stage)) return { kind: 'home' };
    return view;
  };
  const shownView = visibleView(activeTab.view);
  useEffect(() => {
    if (stage === 'qiming') return;
    setDraft(null); setHistoryOpen(false);
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
  const submitSearch = (value = safeDraft) => {
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
    setDraft(null);
    setHistoryOpen(false);
    if (stage === 'qiming') setQimingView('browser');
  };
  const navigate = (direction: -1 | 1) => {
    const nextIndex = activeTab.stackIndex + direction;
    if (nextIndex < 0 || nextIndex >= activeTab.stack.length) return;
    const nextView = visibleView(activeTab.stack[nextIndex]);
    setTabs((current) => current.map((tab) => tab.id === activeTabId ? { ...tab, view: nextView, stackIndex: nextIndex } : tab));
    setDraft(null);
    if (nextView.kind === 'page') manager.recordBrowserPageVisit(nextView.pageId);
  };
  const newTab = () => {
    const id = Math.max(...tabs.map((tab) => tab.id)) + 1;
    setTabs((current) => [...current, { id, view: { kind: 'home' }, stack: [{ kind: 'home' }], stackIndex: 0 }]);
    setActiveTabId(id);
    setDraft(null);
  };
  const closeTab = (id: number) => {
    if (tabs.length === 1) { replaceActive({ kind: 'home' }); setDraft(null); return; }
    const next = tabs.filter((tab) => tab.id !== id);
    setTabs(next);
    if (id === activeTabId) { setActiveTabId(next.at(-1)?.id ?? 1); setDraft(null); }
  };
  const addressValue = draft ?? (shownView.kind === 'page' ? browserPageById.get(shownView.pageId)?.url ?? '' : shownView.kind === 'results' ? shownView.query : '');
  return <section className="browser-app" aria-label="浏览器" data-qiming-view={stage === 'qiming' ? qimingView : 'none'}>
    <div className="browser-tabs" aria-label="浏览器标签页">
      <div className="browser-tabs__scroll">{tabs.map((tab) => { const tabView = visibleView(tab.view); return <div key={tab.id} className={`browser-tab${tab.id === activeTabId ? ' browser-tab--active' : ''}`}><button type="button" className="browser-tab__select" onClick={() => { setActiveTabId(tab.id); setDraft(null); }} aria-current={tab.id === activeTabId ? 'page' : undefined}>{viewLabel(tabView)}</button><button type="button" className="browser-tab__close" onClick={() => closeTab(tab.id)} aria-label={`关闭 ${viewLabel(tabView)}`}>×</button></div>; })}</div>
      <button type="button" className="browser-new-tab" onClick={newTab} aria-label="新建标签页">＋</button>
    </div>
    <header className="browser-toolbar">
      <div className="browser-toolbar__nav"><button type="button" onClick={() => navigate(-1)} disabled={activeTab.stackIndex === 0} aria-label="后退">←</button><button type="button" onClick={() => navigate(1)} disabled={activeTab.stackIndex === activeTab.stack.length - 1} aria-label="前进">→</button></div>
      <form className="browser-address" onSubmit={(event) => { event.preventDefault(); submitSearch((event.currentTarget.querySelector('input') as HTMLInputElement).value); }}><label className="sr-only" htmlFor="browser-search">搜索网页</label><span aria-hidden="true">⌕</span><input id="browser-search" value={addressValue} onChange={(event) => setDraft(event.target.value)} onFocus={() => setDraft(addressValue)} placeholder="搜索或输入地址" autoComplete="off" /></form>
      <button type="button" className="browser-history-button" onClick={() => { if (stage === 'qiming') setQimingView('browser'); setHistoryOpen((open) => !open); }} aria-expanded={historyOpen} aria-label="查看搜索历史">◷ <span>历史</span></button>
    </header>
    {stage === 'qiming' && <>
      <div className="browser-qiming-toolbar" aria-label="启明个案工作区">
        <span>启明 · 实名个案复核</span>
        {qimingView === 'review'
          ? <button type="button" onClick={() => setQimingView('browser')}>查看已读网页</button>
          : <button type="button" onClick={() => { setQimingView('review'); requestAnimationFrame(() => {
            qimingWorkspaceRef.current?.focus({ preventScroll: true });
            if (typeof qimingWorkspaceRef.current?.scrollIntoView === 'function') qimingWorkspaceRef.current.scrollIntoView({ block: 'start' });
          }); }}>返回个案材料复核</button>}
      </div>
      <div ref={qimingWorkspaceRef} id="browser-case-review" className="browser-qiming-workspace" tabIndex={-1} hidden={qimingView !== 'review'}>
        <Act2QimingCaseReview state={state} manager={manager} onOpenPage={openPage} />
      </div>
    </>}
    {historyOpen && (stage !== 'qiming' || qimingView === 'browser') && <aside className="browser-history" aria-label="搜索历史"><strong>最近搜索</strong>{state.modules.browser.queryHistory.filter((query) => stage === 'qiming' || !findSearchQuery(query) || !isAct2T06Record(findSearchQuery(query)!)).length ? state.modules.browser.queryHistory.filter((query) => stage === 'qiming' || !findSearchQuery(query) || !isAct2T06Record(findSearchQuery(query)!)).map((query) => <button type="button" key={query} onClick={() => submitSearch(query)}>{query}</button>) : <p>还没有搜索记录</p>}</aside>}
    <div className="browser-content" hidden={stage === 'qiming' && qimingView === 'review'}>
      {shownView.kind === 'home' && <BrowserHome draft={safeDraft} suggestions={suggestions} onChoose={(query) => { setDraft(query); submitSearch(query); }} />}
      {shownView.kind === 'results' && <BrowserSearchResults query={shownView.query} stage={stage} onOpen={openPage} />}
      {shownView.kind === 'page' && <BrowserPageView page={browserPageById.get(shownView.pageId)} manager={manager} />}
    {stage === 'search' && state.game.flags.FLAG_A2_OFFLINE_RESEARCH_NEEDED === true && <aside className="browser-next-investigation" aria-label="下一步调查">
      <p>这次搜索没有找到能回答问题的资料。可以先把疑问留给当地人。</p>
      <button type="button" onClick={() => manager.setAct2Stage('bridge')}>去桥头问问当地人</button>
    </aside>}
    </div>
  </section>;
}

const CASE_PAGES = {
  huang: { followup: 'PAGE_A2_T06_008', officialExcerptIndex: 0, validText: '宣传记录称成绩提升；后续旧闻却称家属多年未能联系上。', overclaimText: '这些材料已经证明启明导致他失联。' },
  zhong: { followup: 'PAGE_A2_T06_009', officialExcerptIndex: 1, validText: '宣传记录称她恢复学习；后续报道转述家属说她后来离家，之后没有确切消息。', overclaimText: '论坛里的“月子”已经确认就是钟子月。' },
} as const;

function Act2QimingCaseReview({ state, manager, onOpenPage }: { state: ReturnType<StateManager['getState']>; manager: StateManager; onOpenPage: (pageId: string) => void }) {
  const [selected, setSelected] = useState<Record<'huang' | 'zhong', 'supported' | 'overclaim' | ''>>({ huang: '', zhong: '' });
  const [feedback, setFeedback] = useState<Record<'huang' | 'zhong', string>>({ huang: '', zhong: '' });
  const visited = new Set(state.modules.browser.visitedPageIds);
  const reviews = state.modules.act2Research.t06.reviewedCases;
  const reviewed = (caseId: 'huang' | 'zhong') => reviews.some((item) => item.caseId === caseId);
  const legacyComplete = state.modules.act2Research.t06.legacyCompletionMigrated;
  const isComplete = reviewed('huang') && reviewed('zhong') || legacyComplete;
  const reviewCase = (caseId: 'huang' | 'zhong') => {
    const sources = ['PAGE_A2_T06_004', CASE_PAGES[caseId].followup];
    if (selected[caseId] !== 'supported') {
      setFeedback((current) => ({ ...current, [caseId]: '这组材料支持的是宣传与后续说法之间的落差；不能据此认定因果或确认论坛昵称身份。' }));
      return;
    }
    const result = manager.reviewAct2QimingCase(caseId, sources, 'public-claims-and-followup-differ');
    const messages = {
      recorded: '已记录这组实名材料与后续报道的差异。',
      'already-recorded': '这组材料已经记入调查记录。',
      'wrong-stage': '当前不是实名材料复核阶段。',
      'missing-source': '请先打开启明旧站宣传案例和这位学员的后续报道。',
      'invalid-source': '来源不属于这位学员的实名材料。',
      'unsupported-conclusion': '现有材料不足以支持这个结论；已读资料仍保留。',
    } as const;
    setFeedback((current) => ({ ...current, [caseId]: messages[result] }));
  };
  const saveNickname = (assessment: 'possible-unverified' | 'not-enough-evidence') => {
    const saved = manager.recordAct2QimingNicknameAssessment(assessment);
    if (saved) setFeedback((current) => ({ ...current, [visited.has('PAGE_A2_T06_007') ? 'zhong' : 'huang']: '论坛昵称线索已单独记为未核实；它不会代替实名材料复核。' }));
  };
  return <aside className="browser-case-review" aria-label="实名个案材料复核">
    <header className="browser-case-review__header"><div><p className="browser-case-review__eyebrow">第二幕 · 启明后续</p><h2>核对实名个案</h2><p>宣传案例与后续旧闻分别来自不同页面。并排查看原文、出处和日期，再记录材料之间的差异；论坛昵称只作为待核线索。</p></div><span className="browser-case-review__progress">{legacyComplete && reviews.length === 0 ? '此前调查已完成' : `${Number(reviewed('huang')) + Number(reviewed('zhong'))} / 2 已记录`}</span></header>
    <p className="browser-case-review__source"><span>共用来源：启明旧站的学员成长记录</span><button type="button" onClick={() => onOpenPage('PAGE_A2_T06_004')}>{visited.has('PAGE_A2_T06_004') ? '回看启明宣传案例' : '打开启明宣传案例'}</button></p>
    <div className="browser-case-review__cases">
      {(['huang', 'zhong'] as const).map((caseId) => {
        const name = caseId === 'huang' ? '黄子山' : '钟子月';
        const followupId = CASE_PAGES[caseId].followup;
        const sourcesReady = visited.has('PAGE_A2_T06_004') && visited.has(followupId);
        const officialPage = browserPageById.get('PAGE_A2_T06_004')!;
        const followupPage = browserPageById.get(followupId)!;
        const caseReviewed = reviewed(caseId);
        return <section key={caseId} className="browser-case-review__case" aria-label={`${name}材料`}>
          <div className="browser-case-review__case-heading"><h3>{name}</h3><span>{caseReviewed ? '已记录' : legacyComplete ? '此前已完成' : sourcesReady ? '两份来源已读' : '尚缺来源'}</span></div>
          {legacyComplete && !caseReviewed && <p className="browser-case-review__legacy-note">此前完成的调查已恢复。可以回看这些材料，或按来源逐项核对。</p>}
          <div className="browser-case-review__source-cards" aria-label={`${name}宣传与后续来源对照`}>
            {[{ page: officialPage, visited: visited.has(officialPage.id), label: '启明宣传案例' }, { page: followupPage, visited: visited.has(followupPage.id), label: '实名后续报道' }].map(({ page, visited: sourceVisited, label }, index) => {
              const excerpt = index === 0 ? [page.body[CASE_PAGES[caseId].officialExcerptIndex]] : page.body;
              return <article key={page.id} className="browser-case-review__source-card" aria-label={`${label}，${sourceVisited ? page.domain : '尚未打开'}`}>
                <p className="browser-case-review__source-label">{index === 0 ? '宣传材料' : '后续报道'}</p>
                {sourceVisited
                  ? <>
                    <h4>{page.headline}</h4>
                    <p className="browser-case-review__source-meta">{page.domain} · <time dateTime={page.publishedAt}>{page.publishedAt}</time></p>
                    <blockquote>{excerpt.map((line) => <p key={line}>{line}</p>)}</blockquote>
                  </>
                  : <p className="browser-case-review__source-locked">打开来源后显示原文摘录、出处和日期。</p>}
                {index === 1 && <button type="button" onClick={() => onOpenPage(page.id)}>{sourceVisited ? `回看${name}后续报道` : `打开${name}后续报道`}</button>}
              </article>;
            })}
          </div>
          {sourcesReady && !caseReviewed && <fieldset className="browser-case-review__choices">
            <legend>选择这两份来源能支持的发现</legend>
            <label><input type="radio" name={`case-${caseId}`} checked={selected[caseId] === 'supported'} onChange={() => setSelected((current) => ({ ...current, [caseId]: 'supported' }))} />{CASE_PAGES[caseId].validText}</label>
            <label><input type="radio" name={`case-${caseId}`} checked={selected[caseId] === 'overclaim'} onChange={() => setSelected((current) => ({ ...current, [caseId]: 'overclaim' }))} />{CASE_PAGES[caseId].overclaimText}</label>
            <button type="button" className="browser-case-review__submit" disabled={!selected[caseId]} onClick={() => reviewCase(caseId)}>记录这组材料差异</button>
          </fieldset>}
          {caseReviewed && <p className="browser-case-review__record">已记录：{CASE_PAGES[caseId].validText} <button type="button" onClick={() => onOpenPage(followupId)}>回到来源</button></p>}
          {feedback[caseId] && <p className="browser-case-review__feedback" role="status">{feedback[caseId]}</p>}
        </section>;
      })}
    </div>
    {(visited.has('PAGE_A2_T06_006') || visited.has('PAGE_A2_T06_007')) && <details className="browser-case-review__nickname">
      <summary>论坛昵称线索（可选，身份未核实）</summary>
      <p>“黄山”“月子”的发言和转述缺少可核实身份材料。记录相似处或暂不能对应，都不会影响实名个案调查。</p>
      <button type="button" aria-pressed={state.modules.act2Research.t06.nicknameAssessment === 'possible-unverified'} onClick={() => saveNickname('possible-unverified')}>有相似处，但身份待核实</button>
      <button type="button" aria-pressed={state.modules.act2Research.t06.nicknameAssessment === 'not-enough-evidence'} onClick={() => saveNickname('not-enough-evidence')}>现有材料不足以对应</button>
      {state.modules.act2Research.t06.nicknameAssessment && <span role="status">已记录为{state.modules.act2Research.t06.nicknameAssessment === 'possible-unverified' ? '可能有相似处、身份待核实' : '证据不足以对应'}。</span>}
    </details>}
    {isComplete && <footer className="browser-case-review__next"><p>{legacyComplete && reviews.length === 0 ? '此前的个案调查已完成；可以继续与小月核对宣传照片和受访视频。' : '两名学员的实名后续已分别记录。论坛昵称仍未证实，可以与小月继续核对宣传照片和受访视频。'}</p><button type="button" onClick={() => manager.enterAct2FinaleInvestigation()}>与小月继续核对资料</button></footer>}
  </aside>;
}

function BrowserHome({ draft, suggestions, onChoose }: { draft: string; suggestions: string[]; onChoose: (query: string) => void }) {
  return <section className="browser-home"><div><p className="browser-home__eyebrow">网页搜索</p><h2>查找一些旧信息</h2><p>搜索保存下来的网页记录。</p>{draft && <div className="browser-suggestions" aria-label="搜索建议">{suggestions.map((term) => <button type="button" key={term} onClick={() => onChoose(term)}>{term}</button>)}</div>}</div></section>;
}
