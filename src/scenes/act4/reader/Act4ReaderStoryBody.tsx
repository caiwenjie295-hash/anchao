import type { Act4TextSegment } from '../../../data/narrative/act4Presentation';
import { act4DateTimeValue, act4ParagraphKind } from '../../../data/narrative/act4Presentation';
import { backWords, wakeWords } from '../../../data/act4/content';
import type { ActiveAct4NarrativeStage } from '../../../story/act4/narrativePolicy';
import { Act4LastConsciousness } from './Act4LastConsciousness';
import { act4EmphasisRuns } from '../../../data/narrative/act4Emphasis';

export function Act4ReaderStoryBody({
  stage,
  blockId,
  paragraphs,
  currentPage,
  visibleSegments,
  pageIndex,
  pageCount,
  headingTitle,
  focusCurrentPage = true,
  onBroadcastCompleteChange,
}: {
  stage: ActiveAct4NarrativeStage;
  blockId: string;
  paragraphs: readonly string[];
  currentPage: Act4TextSegment | undefined;
  visibleSegments: readonly Act4TextSegment[];
  pageIndex: number;
  pageCount: number;
  headingTitle: string;
  focusCurrentPage?: boolean;
  onBroadcastCompleteChange?: (complete: boolean) => void;
}) {
  return <div className="a4-reader__segment-pages" data-active-segment-id={currentPage?.id} data-active-page={pageIndex + 1} data-page-count={pageCount}>
    {visibleSegments.map((contentSegment) => {
      const isSelectedPage = contentSegment.id === currentPage?.id;
      const isActivePage = focusCurrentPage && isSelectedPage;
      const segmentParagraphs = paragraphs.slice(contentSegment.from, contentSegment.to);
      const dateHeading = stage === 'T03' && blockId === 'T03_ORIGINAL' && isSelectedPage
        ? act4DateTimeValue(segmentParagraphs[0] ?? '')
        : undefined;
      const firstParagraphIsDate = Boolean(dateHeading);
      const pageHeading = stage === 'T10' && blockId === 'T10_FINAL_MAIL'
        ? '最后一封邮件'
        : contentSegment.sceneId
          ? `${contentSegment.sceneLabel || ''}${(contentSegment.scenePageCount ?? 1) > 1 ? ` · 第 ${(contentSegment.scenePageIndex ?? 0) + 1} 页` : ''}`
          : contentSegment.label;
      const showSegmentHeading = Boolean(pageHeading)
        && pageHeading !== headingTitle
        && !/^第\s*\d+\s*(页|段)$/.test(pageHeading)
        && (stage === 'T02' || (stage === 'T10' && blockId === 'T10_FINAL_MAIL' && pageIndex === 0));
      return <section
        className={`a4-reader__segment a4-reader__segment--${contentSegment.role}`}
        data-segment-id={contentSegment.id}
        data-reader-active={isActivePage ? 'true' : undefined}
        aria-label={isActivePage && pageHeading ? pageHeading : undefined}
        tabIndex={isActivePage ? -1 : undefined}
        key={contentSegment.id}
      >
        {showSegmentHeading && <h4>{pageHeading}</h4>}
        {dateHeading && <h4 className="a4-reader__social-date"><time dateTime={dateHeading}>{segmentParagraphs[0]}</time></h4>}
        {stage === 'T09' && blockId === 'T09_BROADCAST'
          ? <Act4LastConsciousness paragraphs={paragraphs} onCompleteChange={onBroadcastCompleteChange} />
          : <div className="a4-reader__paragraphs">{segmentParagraphs.map((paragraph, localIndex) => {
          const index = contentSegment.from + localIndex;
          if (firstParagraphIsDate && localIndex === 0) return null;
          const kind = act4ParagraphKind(stage, blockId, index, paragraph);
          const dateTime = kind === 'social-date' ? act4DateTimeValue(paragraph) : undefined;
          const paragraphClass = kind ? `a4-reader__paragraph a4-reader__paragraph--${kind}` : 'a4-reader__paragraph';
          const runs = isSelectedPage ? act4EmphasisRuns(stage, blockId, paragraph) : [{ text: paragraph, emphasized: false }];
          const text = runs.map((run, runIndex) => run.emphasized
            ? <strong key={`${blockId}-${index}-${runIndex}`}>{run.text}</strong>
            : <span key={`${blockId}-${index}-${runIndex}`}>{run.text}</span>);
          return dateTime
            ? <time className={paragraphClass} dateTime={dateTime} key={`${blockId}-${index}`}>{text}</time>
            : <p className={paragraphClass} key={`${blockId}-${index}`}>{text}</p>;
        })}</div>}
        {stage === 'T10' && blockId === 'T10_AFTERMATH' && contentSegment.id === 'T10_WORDS' && <section className="a4-reader__wordlists" aria-label="两组广播词表">
          <article>
            <h5>VVaKe · 睡前广播</h5>
            <ul>{wakeWords.map((word) => <li key={word}>{word}</li>)}</ul>
          </article>
          <article>
            <h5>13aCK · 早间广播</h5>
            <ul>{backWords.map((word) => <li key={word}>{word}</li>)}</ul>
          </article>
        </section>}
      </section>;
    })}
  </div>;
}
