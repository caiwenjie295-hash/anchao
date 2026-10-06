import { useEffect, useMemo, useRef, useState } from 'react';
import { VisualIcon } from '../../components/VisualIcon';
import { stateManager, type StateManager } from '../../core/stateManager';
import { useAppSelector } from '../../core/hooks/useAppSelector';
import { equalBrowserSnapshot, selectBrowserSnapshot, type BrowserSnapshot } from '../../core/store/selectors';
import { browserPageById, findSearchQuery, getSuggestions, isAct2T06Query, isAct2T06Record, isBrowserPageVisible } from '../../data/browserData';
import { siteIdentity } from './browserPresentation';
import { BrowserPageView } from './BrowserPageView';
import { BrowserSearchResults } from './BrowserSearchResults';
import './browserApp.css';

/** 页面版式已拆到独立组件，这里保留既有导出路径。 */
export { BrowserPageView } from './BrowserPageView';

type QimingCaseId = 'huang' | 'zhong';
type View = { kind: 'home' } | { kind: 'results'; query: string } | { kind: 'page'; pageId: string; casePerson?: QimingCaseId };
type Tab = { id: number; view: View; stack: View[]; stackIndex: number };
const viewLabel = (view: View): string => view.kind === 'home' ? '新标签页' : view.kind === 'results' ? view.query : browserPageById.get(view.pageId)?.headline ?? '页面';
const searchView = (query: string): View => ({ kind: 'results', query: findSearchQuery(query)?.query ?? query.trim() });

export function BrowserApp({ manager = stateManager }: { manager?: StateManager }) {
  const state = useAppSelector(manager, selectBrowserSnapshot, equalBrowserSnapshot);
  const [tabs, setTabs] = useState<Tab[]>([{ id: 1, view: { kind: 'home' }, stack: [{ kind: 'home' }], stackIndex: 0 }]);
  const [activeTabId, setActiveTabId] = useState(1);
  // null means the address follows the active page; '' is an intentional empty edit.
  const [draft, setDraft] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [qimingView, setQimingView] = useState<'review' | 'browser'>('review');
  const [focusedCase, setFocusedCase] = useState<QimingCaseId>(() => {
    const saved = manager.getState().modules.act2Research.t06.reviewedCases;
    return saved.some((item) => item.caseId === 'huang') && !saved.some((item) => item.caseId === 'zhong') ? 'zhong' : 'huang';
  });
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
  const shownPage = shownView.kind === 'page' ? browserPageById.get(shownView.pageId) : undefined;
  const sourceLabel = stage === 'qiming' && qimingView === 'review'
    ? '实名材料核对'
    : shownPage
      ? `${siteIdentity(shownPage).name} · ${shownPage.headline}`
      : shownView.kind === 'results'
        ? '搜索结果'
        : '离线资料浏览器';
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
    if (currentStage === 'qiming') setQimingView('browser');
  };
  const selectCase = (caseId: QimingCaseId) => {
    setFocusedCase(caseId);
    setTabs((current) => current.map((tab) => {
      if (tab.id !== activeTabId || tab.view.kind !== 'page' || tab.view.pageId !== 'PAGE_A2_T06_004') return tab;
      const view = { ...tab.view, casePerson: caseId };
      const stack = [...tab.stack];
      stack[tab.stackIndex] = view;
      return { ...tab, view, stack };
    }));
  };
  const focusCaseReview = (caseId: QimingCaseId) => {
    selectCase(caseId);
    setQimingView('review');
    requestAnimationFrame(() => {
      const heading = qimingWorkspaceRef.current?.querySelector<HTMLElement>(`[data-qiming-case="${caseId}"] h3`);
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView?.({ block: 'center' });
    });
  };
  const caseForPage = (pageId: string): QimingCaseId | undefined => pageId === 'PAGE_A2_T06_008' ? 'huang' : pageId === 'PAGE_A2_T06_009' ? 'zhong' : undefined;
  const openPage = (pageId: string, person?: QimingCaseId) => {
    manager.recordBrowserPageVisit(pageId);
    const casePerson = person ?? caseForPage(pageId);
    replaceActive({ kind: 'page', pageId, ...(stage === 'qiming' && casePerson ? { casePerson } : {}) });
    setDraft(null);
    setHistoryOpen(false);
    if (stage === 'qiming') {
      setQimingView('browser');
      if (casePerson) setFocusedCase(casePerson);
    }
  };
  const navigate = (direction: -1 | 1) => {
    const nextIndex = activeTab.stackIndex + direction;
    if (nextIndex < 0 || nextIndex >= activeTab.stack.length) return;
    const nextView = visibleView(activeTab.stack[nextIndex]);
    setTabs((current) => current.map((tab) => tab.id === activeTabId ? { ...tab, view: nextView, stackIndex: nextIndex } : tab));
    setDraft(null);
    if (stage === 'qiming') {
      setQimingView('browser');
      if (nextView.kind === 'page' && nextView.casePerson) setFocusedCase(nextView.casePerson);
    }
    if (nextView.kind === 'page') manager.recordBrowserPageVisit(nextView.pageId);
  };
  const newTab = () => {
    const id = Math.max(...tabs.map((tab) => tab.id)) + 1;
    setTabs((current) => [...current, { id, view: { kind: 'home' }, stack: [{ kind: 'home' }], stackIndex: 0 }]);
    setActiveTabId(id);
    setDraft(null);
    if (stage === 'qiming') setQimingView('browser');
  };
  const closeTab = (id: number) => {
    if (tabs.length === 1) { replaceActive({ kind: 'home' }); setDraft(null); if (stage === 'qiming') setQimingView('browser'); return; }
    const next = tabs.filter((tab) => tab.id !== id);
    setTabs(next);
    if (id === activeTabId) { setActiveTabId(next.at(-1)?.id ?? 1); setDraft(null); }
    if (stage === 'qiming') setQimingView('browser');
  };
  const addressValue = draft ?? (shownView.kind === 'page' ? browserPageById.get(shownView.pageId)?.url ?? '' : shownView.kind === 'results' ? shownView.query : '');
  return <section className="browser-app" aria-label="浏览器" data-qiming-view={stage === 'qiming' ? qimingView : 'none'}>
    <div className="browser-tabs" aria-label="浏览器标签页">
      <div className="browser-tabs__scroll">{tabs.map((tab) => { const tabView = visibleView(tab.view); return <div key={tab.id} className={`browser-tab${tab.id === activeTabId ? ' browser-tab--active' : ''}`}><button type="button" className="browser-tab__select" onClick={() => { setActiveTabId(tab.id); setDraft(null); if (stage === 'qiming') setQimingView('browser'); }} aria-current={tab.id === activeTabId ? 'page' : undefined}>{viewLabel(tabView)}</button><button type="button" className="browser-tab__close" onClick={() => closeTab(tab.id)} aria-label={`关闭 ${viewLabel(tabView)}`}>×</button></div>; })}</div>
      <button type="button" className="browser-new-tab" onClick={newTab} aria-label="新建标签页">＋</button>
    </div>
    <header className="browser-toolbar">
      <div className="browser-toolbar__nav"><button type="button" onClick={() => navigate(-1)} disabled={activeTab.stackIndex === 0} aria-label="后退">←</button><button type="button" onClick={() => navigate(1)} disabled={activeTab.stackIndex === activeTab.stack.length - 1} aria-label="前进">→</button></div>
      <form className="browser-address" onSubmit={(event) => { event.preventDefault(); submitSearch((event.currentTarget.querySelector('input') as HTMLInputElement).value); }}><label className="sr-only" htmlFor="browser-search">搜索网页</label><span aria-hidden="true"><VisualIcon name="search" size={16} /></span><input id="browser-search" value={addressValue} onChange={(event) => setDraft(event.target.value)} onFocus={() => setDraft(addressValue)} placeholder="搜索或输入地址" autoComplete="off" /></form>
      <button type="button" className="browser-history-button" onClick={() => { if (stage === 'qiming') setQimingView('browser'); setHistoryOpen((open) => !open); }} aria-expanded={historyOpen} aria-label="查看搜索历史"><VisualIcon name="history" size={16} /> <span>历史</span></button>
      <span className="browser-toolbar__source" aria-live="polite" title={sourceLabel}>{sourceLabel}</span>
    </header>
    {stage === 'qiming' && <>
      <div className="browser-qiming-toolbar" aria-label="启明实名材料调查">
        <span>当前核对：{focusedCase === 'huang' ? '黄子山' : '钟子月'}</span>
        {qimingView === 'review'
          ? <button type="button" onClick={() => setQimingView('browser')}>查看已读网页</button>
          : <button type="button" onClick={() => focusCaseReview((activeTab.view.kind === 'page' && activeTab.view.casePerson) || focusedCase)}>{(activeTab.view.kind === 'page' && activeTab.view.casePerson) ? `返回${activeTab.view.casePerson === 'huang' ? '黄子山' : '钟子月'}材料核对` : '返回实名个案核对'}</button>}
      </div>
      <div ref={qimingWorkspaceRef} id="browser-case-review" className="browser-qiming-workspace" tabIndex={-1} hidden={qimingView !== 'review'}>
        <Act2QimingCaseReview state={state} manager={manager} focusedCase={focusedCase} onFocusCase={selectCase} onOpenPage={openPage} onContinueToFinale={() => manager.enterAct2FinaleInvestigation()} />
      </div>
    </>}
    {historyOpen && (stage !== 'qiming' || qimingView === 'browser') && <aside className="browser-history" aria-label="搜索历史"><strong>最近搜索</strong>{state.modules.browser.queryHistory.filter((query) => stage === 'qiming' || !findSearchQuery(query) || !isAct2T06Record(findSearchQuery(query)!)).length ? state.modules.browser.queryHistory.filter((query) => stage === 'qiming' || !findSearchQuery(query) || !isAct2T06Record(findSearchQuery(query)!)).map((query) => <button type="button" key={query} onClick={() => submitSearch(query)}>{query}</button>) : <p>还没有搜索记录</p>}</aside>}
    <div className="browser-content" hidden={stage === 'qiming' && qimingView === 'review'}>
      {shownView.kind === 'home' && <BrowserHome draft={safeDraft} suggestions={suggestions} onChoose={(query) => { setDraft(query); submitSearch(query); }} />}
      {shownView.kind === 'results' && <BrowserSearchResults query={shownView.query} stage={stage} onOpen={openPage} />}
      {shownView.kind === 'page' && <BrowserPageView
        key={shownView.pageId}
        page={browserPageById.get(shownView.pageId)}
        manager={manager}
        copyContextKey={stage === 'qiming' ? `${qimingView}:${focusedCase}` : 'default'}
        casePerson={stage === 'qiming' ? shownView.casePerson : undefined}
        onStartQimingCase={stage === 'qiming' ? focusCaseReview : undefined}
        onReturnToQimingCase={stage === 'qiming' ? focusCaseReview : undefined}
        onOpenQimingSource={stage === 'qiming' ? (person, pageId) => openPage(pageId, person) : undefined}
      />}
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

function Act2QimingCaseReview({ state, manager, focusedCase, onFocusCase, onOpenPage, onContinueToFinale }: {
  state: BrowserSnapshot;
  manager: StateManager;
  focusedCase: QimingCaseId;
  onFocusCase: (caseId: QimingCaseId) => void;
  onOpenPage: (pageId: string, person?: QimingCaseId) => void;
  onContinueToFinale: () => void;
}) {
  const [selected, setSelected] = useState<Record<QimingCaseId, 'supported' | 'overclaim' | ''>>({ huang: '', zhong: '' });
  const [feedback, setFeedback] = useState<Record<QimingCaseId, { tone: 'success' | 'error'; text: string } | null>>({ huang: null, zhong: null });
  const visited = new Set(state.modules.browser.visitedPageIds);
  const reviews = state.modules.act2Research.t06.reviewedCases;
  const reviewed = (caseId: QimingCaseId) => reviews.some((item) => item.caseId === caseId);
  const legacyComplete = state.modules.act2Research.t06.legacyCompletionMigrated;
  const isComplete = reviewed('huang') && reviewed('zhong') || legacyComplete;
  const legacyCompletionCopy = '之前的个案调查已经整理好；材料可以回看，也可以和小月继续核对资料。';
  const caseName = (caseId: QimingCaseId) => caseId === 'huang' ? '黄子山' : '钟子月';
  const caseIds: QimingCaseId[] = ['huang', 'zhong'];
  const reviewedCount = Number(reviewed('huang')) + Number(reviewed('zhong'));
  const officialVisited = visited.has('PAGE_A2_T06_004');
  const caseId = focusedCase;
  const name = caseName(caseId);
  const followupId = CASE_PAGES[caseId].followup;
  const followupVisited = visited.has(followupId);
  const sourcesReady = officialVisited && followupVisited;
  const caseReviewed = reviewed(caseId);
  const officialPage = browserPageById.get('PAGE_A2_T06_004')!;
  const followupPage = browserPageById.get(followupId)!;
  const focusAnotherCase = (nextCase: QimingCaseId) => {
    onFocusCase(nextCase);
    requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>(`[data-qiming-case="${nextCase}"] h3`);
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView?.({ block: 'center' });
    });
  };
  const reviewCase = () => {
    if (selected[caseId] !== 'supported') {
      setFeedback((current) => ({ ...current, [caseId]: { tone: 'error', text: '这里能记下的是宣传记录和后续报道的不同。它们还没有说明原因，论坛里相似的昵称也没有可核对的身份信息。' } }));
      return;
    }
    const result = manager.reviewAct2QimingCase(caseId, ['PAGE_A2_T06_004', followupId], 'public-claims-and-followup-differ');
    const messages = {
      recorded: '已记录这组实名材料与后续报道的差异。',
      'already-recorded': '这组材料已经记入调查记录。',
      'wrong-stage': '当前不是实名材料复核阶段。',
      'missing-source': '请先打开启明旧站宣传案例和这位学员的后续报道。',
      'invalid-source': '来源不属于这位学员的实名材料。',
      'unsupported-conclusion': '现有材料不足以支持这个结论；已读资料仍保留。',
    } as const;
    setFeedback((current) => ({ ...current, [caseId]: { tone: result === 'recorded' || result === 'already-recorded' ? 'success' : 'error', text: messages[result] } }));
  };
  const saveNickname = (assessment: 'possible-unverified' | 'not-enough-evidence') => {
    const saved = manager.recordAct2QimingNicknameAssessment(assessment);
    if (saved) setFeedback((current) => ({ ...current, [caseId]: { tone: 'success', text: '论坛昵称线索已单独记为未核实；它不会代替实名材料复核。' } }));
  };
  const nextCase = caseIds.find((id) => id !== caseId && !reviewed(id));
  const nextStep = legacyComplete
    ? legacyCompletionCopy
    : caseReviewed
      ? nextCase ? `${name}的材料已经记下；要继续了解${caseName(nextCase)}吗？` : '两份实名材料都已经记下，可以和小月接着看看照片和视频。'
      : !officialVisited ? `先看看宣传页当时怎样介绍${name}。`
        : !followupVisited ? `宣传页已经看过；接着读读${name}后来的报道。`
          : '两份材料都读过了。看看它们各自写了什么，再决定要记下的发现。';
  return <aside className="browser-case-review" aria-label="实名个案材料复核">
    <header className="browser-case-review__header"><div><p className="browser-case-review__eyebrow">第二幕 · 启明后续</p><h2>核对实名材料</h2><p>黄子山和钟子月的记录分开摆在这里。看过宣传页和各自的后续报道后，再把读到的内容记下来。网上相似的昵称不能确认本人；想看时再打开即可。</p></div><span className="browser-case-review__progress">{legacyComplete ? '调查记录可回看' : `${reviewedCount} / 2 已记录`}</span></header>
    <nav className="browser-case-review__person-switcher" aria-label="选择当前实名个案">
      {caseIds.map((person) => {
        const personOfficialRead = officialVisited;
        const personFollowupRead = visited.has(CASE_PAGES[person].followup);
        const personStatus = reviewed(person) ? '已记录' : `来源 ${Number(personOfficialRead) + Number(personFollowupRead)} / 2 已读`;
        return <button key={person} type="button" className="browser-case-review__person" aria-pressed={focusedCase === person} onClick={() => onFocusCase(person)}>
          <span>{`核对${caseName(person)}`}</span><small>{personStatus}</small>
        </button>;
      })}
    </nav>
    <section className="browser-case-review__case" aria-label={`${name}材料`} data-qiming-case={caseId}>
      <div className="browser-case-review__case-heading"><h3 tabIndex={-1}>{name}材料</h3><span>{caseReviewed ? '已记录' : legacyComplete ? '旧版调查已完成' : `${Number(officialVisited) + Number(followupVisited)} / 2 来源已读`}</span></div>
      <p className="browser-case-review__next-step" aria-live="polite">{nextStep}</p>
      {legacyComplete && !caseReviewed && <p className="browser-case-review__legacy-note">{legacyCompletionCopy}</p>}
      <div className="browser-case-review__source-cards" aria-label={`${name}宣传与后续来源对照`}>
        {[{ page: officialPage, sourceVisited: officialVisited, label: '共用宣传案例', action: 'open-official' as const }, { page: followupPage, sourceVisited: followupVisited, label: `${name}后续报道`, action: 'open-followup' as const }].map(({ page, sourceVisited, label, action }, index) => {
          const excerpt = index === 0 ? [page.body[CASE_PAGES[caseId].officialExcerptIndex]] : page.body;
          return <article key={page.id} className="browser-case-review__source-card" aria-label={`${label}，${sourceVisited ? page.domain : '尚未打开'}`}>
            <p className="browser-case-review__source-label">{index === 0 ? '共用宣传材料' : '个人后续报道'} · {sourceVisited ? '已读' : '待打开'}</p>
            {sourceVisited
              ? <>
                <h4>{page.headline}</h4>
                <p className="browser-case-review__source-meta">{page.domain} · <time dateTime={page.publishedAt}>{page.publishedAt}</time></p>
                <blockquote>{excerpt.map((line) => <p key={line}>{line}</p>)}</blockquote>
                {!caseReviewed && <button type="button" className="browser-case-review__source-link" data-case-action={action} onClick={() => onOpenPage(page.id, caseId)}>回看{label}</button>}
              </>
              : <p className="browser-case-review__source-locked">打开后可查看网页内容和发布时间。</p>}
          </article>;
        })}
      </div>
      {caseReviewed && <p className="browser-case-review__record">已记录：{CASE_PAGES[caseId].validText} <button type="button" onClick={() => onOpenPage(followupId, caseId)}>回看{name}后续报道</button></p>}
      {!caseReviewed && !officialVisited && <button type="button" className="browser-case-review__step-action" data-case-action="open-official" onClick={() => onOpenPage('PAGE_A2_T06_004', caseId)}>打开共用宣传案例（{name}）</button>}
      {!caseReviewed && officialVisited && !followupVisited && <button type="button" className="browser-case-review__step-action" data-case-action="open-followup" onClick={() => onOpenPage(followupId, caseId)}>打开{name}后续报道</button>}
      {sourcesReady && !caseReviewed && <fieldset className="browser-case-review__choices">
        <legend>选择这两份来源能支持的发现</legend>
        <label><input type="radio" name={`case-${caseId}`} checked={selected[caseId] === 'supported'} onChange={() => setSelected((current) => ({ ...current, [caseId]: 'supported' }))} />{CASE_PAGES[caseId].validText}</label>
        <label><input type="radio" name={`case-${caseId}`} checked={selected[caseId] === 'overclaim'} onChange={() => setSelected((current) => ({ ...current, [caseId]: 'overclaim' }))} />{CASE_PAGES[caseId].overclaimText}</label>
        <button type="button" className="browser-case-review__submit" data-case-action="record" disabled={!selected[caseId]} onClick={reviewCase}>记录{name}材料差异</button>
      </fieldset>}
      {feedback[caseId] && <p className={`browser-case-review__feedback browser-case-review__feedback--${feedback[caseId]!.tone}`} role="status">{feedback[caseId]!.text}</p>}
      {caseReviewed && nextCase && <div className="browser-case-review__next-person"><p>{name}的材料已记录。下一步由你选择是否核对另一人。</p><button type="button" data-case-action="next-person" onClick={() => focusAnotherCase(nextCase)}>{`继续核对${caseName(nextCase)}`}</button></div>}
    </section>
    {(visited.has('PAGE_A2_T06_006') || visited.has('PAGE_A2_T06_007')) && <details className="browser-case-review__nickname">
      <summary>论坛昵称线索（可选，身份未核实）</summary>
      <p>“黄山”“月子”的发言和转述缺少可核实身份材料。记录相似处或暂不能对应，都不会影响实名个案调查。</p>
      <button type="button" aria-pressed={state.modules.act2Research.t06.nicknameAssessment === 'possible-unverified'} onClick={() => saveNickname('possible-unverified')}>有相似处，但身份待核实</button>
      <button type="button" aria-pressed={state.modules.act2Research.t06.nicknameAssessment === 'not-enough-evidence'} onClick={() => saveNickname('not-enough-evidence')}>现有材料不足以对应</button>
      {state.modules.act2Research.t06.nicknameAssessment && <span role="status">已记录为{state.modules.act2Research.t06.nicknameAssessment === 'possible-unverified' ? '可能有相似处、身份待核实' : '证据不足以对应'}。</span>}
    </details>}
    {isComplete && <footer className="browser-case-review__next"><p>{legacyComplete ? legacyCompletionCopy : '两名学员的实名后续已分别记录。论坛昵称仍未证实，可以与小月继续核对宣传照片和受访视频。'}</p><button type="button" data-case-action="continue" onClick={onContinueToFinale}>与小月继续核对资料</button></footer>}
  </aside>;
}

function BrowserHome({ draft, suggestions, onChoose }: { draft: string; suggestions: string[]; onChoose: (query: string) => void }) {
  return <section className="browser-home"><div><p className="browser-home__eyebrow">网页搜索</p><h2>查找一些旧信息</h2><p>搜索保存下来的网页记录。</p>{draft && <div className="browser-suggestions" aria-label="搜索建议">{suggestions.map((term) => <button type="button" key={term} onClick={() => onChoose(term)}>{term}</button>)}</div>}</div></section>;
}
