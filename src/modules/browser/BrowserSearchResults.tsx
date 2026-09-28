import { assetLoader } from '../../core/assetLoader';
import type { Act2Stage } from '../../core/types';
import { getResultsForQuery, type BrowserPage } from '../../data/browserData';
import { PAGE_TYPE_LABEL, resultShowsKeywords, resultVariantFor, siteIdentity, urlCrumbs } from './browserPresentation';

function ResultItem({ page, onOpen }: { page: BrowserPage; onOpen: (pageId: string) => void }) {
  const identity = siteIdentity(page);
  const variant = resultVariantFor(page.pageType);
  const crumbs = urlCrumbs(page.url);
  const thumbnail = page.images?.[0] ? assetLoader.get(page.images[0].assetId)?.src ?? null : null;
  return <button type="button" className={`browser-result browser-result--${variant}`} onClick={() => onOpen(page.id)}>
    <span className="browser-result__origin">
      <span className="browser-result__logo" aria-hidden="true">{identity.monogram}</span>
      <span className="browser-result__site">{identity.name}</span>
      {variant === 'report' && <time className="browser-result__date" dateTime={page.publishedAt}>{page.publishedAt}</time>}
    </span>
    <span className="browser-result__title">{page.headline}</span>
    {variant === 'reference' && crumbs.length > 0 && <span className="browser-result__path">{crumbs.join(' › ')}</span>}
    <span className="browser-result__summary">
      <span className="browser-result__snippet">{page.snippet}</span>
      {thumbnail && <span className="browser-result__thumb"><img src={thumbnail} alt="" /></span>}
    </span>
    {resultShowsKeywords(page.pageType) && page.keywords.length > 0 && <span className="browser-result__keywords">{page.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</span>}
    <span className="browser-result__footer">
      <span className="browser-result__kind">{PAGE_TYPE_LABEL[page.pageType]}</span>
      {variant !== 'report' && <time className="browser-result__date" dateTime={page.publishedAt}>{page.publishedAt}</time>}
      {variant === 'thread' && <span className="browser-result__count">{page.body.length} 条发言</span>}
    </span>
  </button>;
}

export function BrowserSearchResults({ query, stage, onOpen }: { query: string; stage: Act2Stage | null; onOpen: (pageId: string) => void }) {
  const results = getResultsForQuery(query, stage);
  const sourceCount = new Set(results.map((page) => page.domain)).size;
  return <section className="browser-results" aria-live="polite">
    <header className="browser-results__summary">
      <p>网页搜索</p>
      <h2>{query}</h2>
      <p className="browser-results__stats">
        <span>{results.length ? `${results.length} 条结果` : '没有完全匹配的结果'}</span>
        {results.length > 0 && <span>来自 {sourceCount} 个来源</span>}
      </p>
    </header>
    {results.length > 0 && <ol className="browser-results__list">{results.map((page) => <li key={page.id}><ResultItem page={page} onOpen={onOpen} /></li>)}</ol>}
    {results.length === 0 && <p className="browser-empty">试试“鸡公岭”“XX县失踪”或其他搜索建议。</p>}
  </section>;
}
