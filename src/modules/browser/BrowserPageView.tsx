import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { EvidenceImage } from '../../components/EvidenceImage';
import type { StateManager } from '../../core/stateManager';
import { type BrowserPage, type BrowserPageInteraction, type BrowserPageType } from '../../data/browserData';
import { PAGE_TYPE_LABEL, labeledEntries, leadLinesAndNote, parseForumPosts, siteIdentity, urlCrumbs, type SiteIdentity } from './browserPresentation';

type TemplateProps = { page: BrowserPage; identity: SiteIdentity };
type Template = (props: TemplateProps) => ReactNode;
type PagePicture = { assetId: string; caption: string };

const kickerSource = (identity: SiteIdentity): string => identity.board ?? identity.host ?? identity.name;

function PageFigure({ picture, wide = false }: { picture: PagePicture; wide?: boolean }) {
  return <figure className={`browser-page__figure${wide ? ' browser-page__figure--wide' : ''}`}>
    <EvidenceImage assetId={picture.assetId} caption={picture.caption} />
    <figcaption>{picture.caption}</figcaption>
  </figure>;
}

function KeywordTags({ page }: { page: BrowserPage }) {
  if (page.keywords.length === 0) return null;
  return <ul className="browser-page__tags" aria-label="页面标签">{page.keywords.map((keyword) => <li key={keyword}>{keyword}</li>)}</ul>;
}

function NewsArticle({ page, identity }: TemplateProps) {
  const [lead, ...rest] = page.body;
  const pictures = page.images ?? [];
  return <>
    <header className="browser-page__header">
      <p className="browser-page__kicker">{identity.host || identity.name} · {PAGE_TYPE_LABEL[page.pageType]}</p>
      <h1>{page.headline}</h1>
      <p className="browser-page__byline"><span>来源：{identity.name}</span><time dateTime={page.publishedAt}>{page.publishedAt}</time></p>
    </header>
    {pictures[0] && <PageFigure picture={pictures[0]} wide />}
    <div className="browser-prose">
      <p className="browser-prose__lead">{lead}</p>
      {rest.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      {pictures.slice(1).map((picture) => <PageFigure key={picture.assetId} picture={picture} />)}
    </div>
    <aside className="browser-news-related"><h2>相关阅读</h2><p>{page.keywords.length ? page.keywords.join(' · ') : '更多本地报道'}</p></aside>
  </>;
}

function EncyclopediaEntry({ page, identity }: TemplateProps) {
  const [lead, ...rest] = page.body;
  return <>
    <header className="browser-page__header">
      <p className="browser-page__kicker">{identity.host || identity.name} · {PAGE_TYPE_LABEL[page.pageType]}</p>
      <h1>{page.headline}</h1>
      <p className="browser-page__byline"><span>{identity.name}</span><time dateTime={page.publishedAt}>最后更新 {page.publishedAt}</time></p>
    </header>
    <nav className="browser-entry-toc" aria-label="条目目录"><strong>目录</strong><a href="#entry-overview">概述</a><a href="#entry-details">详细记录</a><a href="#entry-sources">来源</a></nav>
    <div className="browser-page__columns">
      <div className="browser-prose">
        <p id="entry-overview" className="browser-prose__lead">{lead}</p>
        <div id="entry-details">{rest.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      </div>
      <aside className="browser-page__aside" aria-label="条目信息">
        <h2>条目信息</h2>
        <dl className="browser-page__facts">
          <div><dt>来源站点</dt><dd>{identity.name}</dd></div>
          <div><dt>最近更新</dt><dd>{page.publishedAt}</dd></div>
          {page.keywords.length > 0 && <div><dt>相关条目</dt><dd>{page.keywords.join('、')}</dd></div>}
        </dl>
      </aside>
    </div>
    <footer id="entry-sources" className="browser-entry-sources"><strong>来源与修订</strong><p>{identity.name} · 最近更新 {page.publishedAt}</p></footer>
  </>;
}

function ForumThread({ page, identity }: TemplateProps) {
  const posts = parseForumPosts(page);
  return <>
    <header className="browser-page__header">
      <p className="browser-page__kicker">{kickerSource(identity)} · {PAGE_TYPE_LABEL[page.pageType]}</p>
      <h1>{page.headline}</h1>
      <p className="browser-page__byline"><span>{posts.length} 条发言</span><time dateTime={page.publishedAt}>最后回复 {page.publishedAt}</time></p>
    </header>
    <nav className="browser-forum-nav" aria-label="社区导航"><span>社区首页</span><span>{identity.board ?? '话题讨论'}</span><span>帖子正文</span></nav>
    <ol className="browser-thread">{posts.map((post, index) => <li className="browser-thread__post" key={index}>
      <span className="browser-thread__avatar" aria-hidden="true">{Array.from(post.author)[0] ?? '·'}</span>
      <div className="browser-thread__body">
        <div className="browser-thread__author">
          <strong>{post.author}</strong><span>{index + 1} 楼</span>
          {post.date && <time dateTime={post.date}>{post.date}</time>}
        </div>
        <p className="browser-thread__text">{post.text}</p>
      </div>
    </li>)}</ol>
  </>;
}

function TrailGuide({ page, identity }: TemplateProps) {
  return <>
    <header className="browser-page__header">
      <p className="browser-page__kicker">{identity.host || identity.name} · {PAGE_TYPE_LABEL[page.pageType]}</p>
      <h1>{page.headline}</h1>
      <p className="browser-page__byline"><span>{identity.name}</span><time dateTime={page.publishedAt}>更新 {page.publishedAt}</time></p>
    </header>
    <section className="browser-guide" aria-label="路线要点">
      <h2>路线要点</h2>
      <ol className="browser-guide__steps">{page.body.map((line, index) => <li key={index}>
        <span className="browser-guide__index" aria-hidden="true">{index + 1}</span>
        <p>{line}</p>
      </li>)}</ol>
    </section>
    <KeywordTags page={page} />
  </>;
}

function WeatherBoard({ page, identity }: TemplateProps) {
  const { rows, note } = leadLinesAndNote(page.body);
  return <>
    <header className="browser-page__header">
      <p className="browser-page__kicker">{identity.host || identity.name} · {PAGE_TYPE_LABEL[page.pageType]}</p>
      <h1>{page.headline}</h1>
      <p className="browser-page__byline"><span>{identity.name}</span><time dateTime={page.publishedAt}>观测 {page.publishedAt}</time></p>
    </header>
    <section className="browser-weather" aria-label="当日概况">
      <h2>当日概况</h2>
      <ul className="browser-weather__rows">{rows.map((row, index) => <li key={index}>{row}</li>)}</ul>
      {note && <p className="browser-page__note">{note}</p>}
    </section>
    <KeywordTags page={page} />
  </>;
}

function MapBoard({ page, identity }: TemplateProps) {
  const picture = page.images?.[0];
  return <>
    <header className="browser-page__header">
      <p className="browser-page__kicker">{identity.host || identity.name} · {PAGE_TYPE_LABEL[page.pageType]}</p>
      <h1>{page.headline}</h1>
      <p className="browser-page__byline"><span>{identity.name}</span><time dateTime={page.publishedAt}>标注 {page.publishedAt}</time></p>
    </header>
    {picture && <PageFigure picture={picture} wide />}
    <section className="browser-mapboard" aria-label="图上说明">
      <h2>图上说明</h2>
      <ul className="browser-mapboard__notes">{page.body.map((line, index) => <li key={index}>{line}</li>)}</ul>
    </section>
    <KeywordTags page={page} />
  </>;
}

function JournalPost({ page, identity }: TemplateProps) {
  const grouped = labeledEntries(page.body);
  const [lead, ...rest] = page.body;
  return <>
    <header className="browser-page__header browser-page__header--journal">
      <p className="browser-page__kicker">{kickerSource(identity)} · {PAGE_TYPE_LABEL[page.pageType]}</p>
      <h1>{page.headline}</h1>
      <p className="browser-page__byline"><span>{identity.name}</span><time dateTime={page.publishedAt}>发布 {page.publishedAt}</time></p>
    </header>
    {grouped
      ? <>
        <section className="browser-cases" aria-label="页面列出的条目">
          <h2>页面列出的条目</h2>
          <ul>{grouped.entries.map((entry) => <li key={entry.label}>
            <span className="browser-cases__label">{entry.label}</span>
            <p>{entry.text}</p>
          </li>)}</ul>
        </section>
        {grouped.rest.length > 0 && <div className="browser-prose">{grouped.rest.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
      </>
      : <div className="browser-prose">
        <p className="browser-prose__lead">{lead}</p>
        {rest.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </div>}
    <KeywordTags page={page} />
  </>;
}

function CommercialListing({ page, identity }: TemplateProps) {
  return <>
    <header className="browser-page__header">
      <p className="browser-page__kicker">{identity.host || identity.name} · {PAGE_TYPE_LABEL[page.pageType]}</p>
      <h1>{page.headline}</h1>
      <p className="browser-page__byline"><span>{identity.name}</span><time dateTime={page.publishedAt}>更新 {page.publishedAt}</time></p>
    </header>
    <section className="browser-listing" aria-label="页面要点">
      <h2>页面要点</h2>
      <ul className="browser-listing__rows">{page.body.map((line, index) => <li key={index}>
        <span className="browser-listing__marker" aria-hidden="true" />
        <p>{line}</p>
      </li>)}</ul>
    </section>
    <KeywordTags page={page} />
  </>;
}

const TEMPLATE_BY_TYPE: Record<BrowserPageType, Template> = {
  news: NewsArticle,
  incident: NewsArticle,
  encyclopedia: EncyclopediaEntry,
  'same-name': EncyclopediaEntry,
  'trail-guide': TrailGuide,
  weather: WeatherBoard,
  map: MapBoard,
  forum: ForumThread,
  'self-media': JournalPost,
  commercial: CommercialListing,
};

function SiteMasthead({ identity, crumbs }: { identity: SiteIdentity; crumbs: string[] }) {
  return <div className="browser-page__masthead">
    <span className="browser-page__logo" aria-hidden="true">{identity.monogram}</span>
    <span className="browser-page__brand">
      <strong>{identity.name}</strong>
      {identity.board ? <span className="browser-page__board">{identity.board}</span> : null}
    </span>
    {crumbs.length > 0 && <p className="browser-page__crumb">{crumbs.join(' › ')}</p>}
  </div>;
}

type QimingCaseId = 'huang' | 'zhong';
type BrowserPageViewProps = {
  page: BrowserPage | undefined;
  manager: StateManager;
  copyContextKey?: string;
  casePerson?: QimingCaseId;
  onStartQimingCase?: (person: QimingCaseId) => void;
  onReturnToQimingCase?: (person: QimingCaseId) => void;
  onOpenQimingSource?: (person: QimingCaseId, pageId: string) => void;
};

function QimingCasePath({ page, person, onStart, onReturn, onOpenSource, manager }: {
  page: BrowserPage;
  person?: QimingCaseId;
  onStart?: (person: QimingCaseId) => void;
  onReturn?: (person: QimingCaseId) => void;
  onOpenSource?: (person: QimingCaseId, pageId: string) => void;
  manager: StateManager;
}) {
  const relatedPerson = person ?? (page.id === 'PAGE_A2_T06_008' ? 'huang' : page.id === 'PAGE_A2_T06_009' ? 'zhong' : undefined);
  if (page.id !== 'PAGE_A2_T06_004' && page.id !== 'PAGE_A2_T06_008' && page.id !== 'PAGE_A2_T06_009') return null;
  if (page.id === 'PAGE_A2_T06_004' && !relatedPerson && onStart) return <aside className="browser-page__case-path" aria-label="启明实名调查入口">
    <h2>从宣传案例开始核对</h2>
    <p>这份宣传记录同时提到黄子山和钟子月。选择一人进入材料核对；复制姓名只用于手动搜索，也可以直接开始调查。</p>
    <div className="browser-page__case-entries">
      <button type="button" className="browser-page__case-entry" onClick={() => onStart('huang')}>调查黄子山材料</button>
      <button type="button" className="browser-page__case-entry" onClick={() => onStart('zhong')}>调查钟子月材料</button>
    </div>
  </aside>;
  if (!relatedPerson || !onReturn) return null;
  const name = relatedPerson === 'huang' ? '黄子山' : '钟子月';
  const followupId = relatedPerson === 'huang' ? 'PAGE_A2_T06_008' : 'PAGE_A2_T06_009';
  const visited = new Set(manager.getState().modules.browser.visitedPageIds);
  const officialVisited = visited.has('PAGE_A2_T06_004');
  const followupVisited = visited.has(followupId);
  const currentLabel = page.id === 'PAGE_A2_T06_004' ? '共用宣传案例' : `${name}后续报道`;
  const nextSourceId = !officialVisited ? 'PAGE_A2_T06_004' : !followupVisited ? followupId : undefined;
  const nextSourceLabel = nextSourceId === 'PAGE_A2_T06_004' ? '打开共用宣传案例' : `打开${name}后续报道`;
  return <aside className="browser-page__case-path" aria-label={`正在调查${name}`}>
    <div className="browser-page__case-path-heading"><div><p className="browser-page__case-path-eyebrow">实名材料核对</p><h2>正在调查：{name}</h2></div><span>当前来源：{currentLabel}</span></div>
    <ul className="browser-page__case-path-sources" aria-label={`${name}来源状态`}>
      <li><span>共用宣传案例</span><strong>{officialVisited ? '已打开' : '待打开'}</strong></li>
      <li><span>{name}后续报道</span><strong>{followupVisited ? '已打开' : '待打开'}</strong></li>
    </ul>
    <div className="browser-page__case-path-actions">
      {nextSourceId && onOpenSource && <button type="button" onClick={() => onOpenSource(relatedPerson, nextSourceId)}>{nextSourceLabel}</button>}
      <button type="button" className="browser-page__case-context-return" onClick={() => onReturn(relatedPerson)}>{`返回${name}材料核对`}</button>
    </div>
  </aside>;
}

export function BrowserPageView({ page, manager, copyContextKey, casePerson, onStartQimingCase, onReturnToQimingCase, onOpenQimingSource }: BrowserPageViewProps) {
  const [copyStatus, setCopyStatus] = useState<{ tone: 'success' | 'failure'; text: string } | null>(null);
  useEffect(() => setCopyStatus(null), [page?.id, copyContextKey]);
  const visited = manager.getState().modules.browser.visitedPageIds;
  if (!page) return <p className="browser-empty">该内部页面已不可用。</p>;
  const interactions = (page.interactions ?? []).filter((interaction) => (
    ('requiredVisitedPageIds' in interaction ? interaction.requiredVisitedPageIds.every((id) => visited.includes(id)) : true)
    && ('requiredFlags' in interaction ? interaction.requiredFlags.every((id) => manager.getState().game.flags[id] === true) : true)
  ));
  const copyName = async (interaction: Extract<BrowserPageInteraction, { type: 'copy-names' }>, name: string) => {
    try {
      await navigator.clipboard.writeText(name);
      setCopyStatus({ tone: 'success', text: interaction.successMessage.replaceAll('{name}', name) });
    } catch {
      setCopyStatus({ tone: 'failure', text: interaction.failureMessage.replaceAll('{name}', name) });
    }
  };
  const runInteraction = (interaction: BrowserPageInteraction) => {
    if (interaction.type === 'qiming-name-match') manager.inferAct2QimingNameMatch(interaction.person);
    if (interaction.type === 'confirm-other-cases') manager.confirmAct2OtherCasesAbnormal();
  };
  const identity = siteIdentity(page);
  const Template = TEMPLATE_BY_TYPE[page.pageType];
  return <article className={`browser-page browser-page--${page.pageType}`} style={{ '--browser-site-hue': identity.hue } as unknown as CSSProperties}>
    <SiteMasthead identity={identity} crumbs={urlCrumbs(page.url)} />
    <Template page={page} identity={identity} />
    <QimingCasePath page={page} person={casePerson} onStart={onStartQimingCase} onReturn={onReturnToQimingCase} onOpenSource={onOpenQimingSource} manager={manager} />
    <footer className="browser-page__footer"><p className="browser-page__url">{page.url}</p></footer>
    {interactions.map((interaction, index) => <div className="browser-page__actions" key={`${page.id}-interaction-${index}`}><p>{interaction.prompt}</p>{interaction.type === 'copy-names' ? <>{copyStatus && <p className={`browser-page__copy-feedback browser-page__copy-feedback--${copyStatus.tone}`} role="status">{copyStatus.text}</p>}{interaction.names.map((name) => <button type="button" key={name.value} onClick={() => void copyName(interaction, name.value)}>{name.buttonLabel}</button>)}</> : <button type="button" onClick={() => runInteraction(interaction)}>{interaction.buttonLabel}</button>}</div>)}
  </article>;
}
