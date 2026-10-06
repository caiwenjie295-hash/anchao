import type { Act4TextSegment } from '../../../data/narrative/act4Presentation';
import type { ActiveAct4NarrativeStage } from '../../../story/act4/narrativePolicy';

export function Act4ReaderPager({
  stage,
  blockId,
  paragraphs,
  pages,
  pageIndex,
  onSelectPage,
  navLabel,
}: {
  stage: ActiveAct4NarrativeStage;
  blockId: string;
  paragraphs: readonly string[];
  pages: readonly Act4TextSegment[];
  pageIndex: number;
  onSelectPage: (index: number) => void;
  navLabel: string;
}) {
  const selectPage = (index: number) => {
    if (index < 0 || index >= pages.length) return;
    onSelectPage(index);
  };
  const pageLabel = (item: Act4TextSegment, index: number) => {
    const dateLabel = stage === 'T03' && blockId === 'T03_ORIGINAL' ? paragraphs[item.from] : item.label;
    return stage === 'T10' && blockId === 'T10_FINAL_MAIL'
      ? `最后一封邮件 · ${index + 1}/${pages.length}`
      : item.scenePageCount && item.scenePageCount > 1
        ? `${item.sceneLabel} · ${item.scenePageIndex! + 1}/${item.scenePageCount}`
        : stage === 'T05' && blockId === 'T05_ORIGINAL'
          ? item.label || `第 ${index + 1} 段`
          : dateLabel || `第 ${index + 1} 页`;
  };

  return <>
    {pages.length > 1 && <>
      <nav className="a4-reader__pager" aria-label={navLabel}>
        <button type="button" disabled={pageIndex === 0} onClick={() => selectPage(Math.max(0, pageIndex - 1))}>上一页</button>
        <span aria-live="polite">{pageIndex + 1} / {pages.length}</span>
        <button type="button" disabled={pageIndex >= pages.length - 1} onClick={() => selectPage(Math.min(pages.length - 1, pageIndex + 1))}>下一页</button>
      </nav>
      <details className="a4-reader__page-directory">
        <summary>已读目录：{pageIndex + 1} / {pages.length}</summary>
        <nav aria-label={`${navLabel}目录`}>
          {pages.slice(0, pageIndex + 1).map((item, index) => <button type="button" key={item.id} aria-current={pageIndex === index ? 'page' : undefined} onClick={() => selectPage(index)}>
            {pageLabel(item, index)}
          </button>)}
        </nav>
      </details>
    </>}
  </>;
}
