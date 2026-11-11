import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  estimateTaleChunks,
  layoutTaleSpreads,
  packParagraphsUntil,
  type TaleFaceKind,
  type TaleSpreadPlan,
} from './libraryEndmatter';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sameFaces(left: string[][], right: string[][]): boolean {
  return left.length === right.length
    && left.every((chunk, index) => chunk.length === right[index].length && chunk.every((paragraph, pIndex) => paragraph === right[index][pIndex]));
}

function fillBench(root: HTMLElement, kind: TaleFaceKind, paragraphs: readonly string[], fontSize: number) {
  const contrast = root.querySelector<HTMLElement>('[data-measure-contrast]');
  const header = root.querySelector<HTMLElement>('[data-measure-header]');
  const cont = root.querySelector<HTMLElement>('[data-measure-cont]');
  const text = root.querySelector<HTMLElement>('[data-measure-text]');
  if (!text) return null;
  if (contrast) contrast.hidden = kind !== 'cont-left';
  // first-right keeps the record title header; continuations drop it.
  if (header) header.hidden = kind !== 'first-right';
  // Reserve the 续 line so a later multi-face pack cannot overflow the live box.
  if (cont) cont.hidden = false;
  text.style.fontSize = `${fontSize}px`;
  text.innerHTML = paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('');
  return text;
}


function syncBenchTextWidths(liveBook: HTMLElement, leftPage: HTMLElement | null, rightPage: HTMLElement | null) {
  const assign = (liveSelector: string, benchPage: HTMLElement | null) => {
    const live = liveBook.querySelector<HTMLElement>(liveSelector);
    const text = benchPage?.querySelector<HTMLElement>('[data-measure-text]');
    if (!text) return;
    const width = live && live.clientWidth >= 24 ? live.clientWidth : text.clientWidth;
    if (width >= 24) {
      text.style.width = `${width}px`;
      text.style.maxWidth = `${width}px`;
      text.style.boxSizing = 'border-box';
    }
  };
  assign('.act2-library__book-page--right .act2-library__endmatter-body', rightPage);
  assign('.act2-library__book-page--left .act2-library__endmatter-body', leftPage);
}

/** Size the bench like the on-screen reader book, never the afterword-shrunk height. */
function syncBenchToLiveBook(liveBook: HTMLElement, benchBook: HTMLElement) {
  const root = liveBook.closest('.act2-library');
  const shrunk = Boolean(root?.classList.contains('act2-library--has-afterword'));
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const canonicalHeight = Math.min(540, Math.max(420, viewportH - 220));
  const liveStyle = getComputedStyle(liveBook);
  benchBook.style.width = `${liveBook.offsetWidth}px`;
  benchBook.style.height = `${shrunk ? canonicalHeight : liveBook.offsetHeight}px`;
  benchBook.style.padding = liveStyle.padding;
  benchBook.style.boxSizing = liveStyle.boxSizing;
  benchBook.style.display = liveStyle.display;
  void benchBook.offsetHeight;
}

function faceOverflows(text: HTMLElement): boolean {
  const last = text.querySelector('p:last-child');
  if (!last) return false;
  const box = text.getBoundingClientRect();
  const lastBox = last.getBoundingClientRect();
  return lastBox.bottom > box.bottom + 0.5 || text.scrollHeight > text.clientHeight + 0.5;
}

function MeasureFace({
  which,
  withTab,
  pageRef,
}: {
  which: 'left' | 'right';
  withTab: boolean;
  pageRef: (node: HTMLDivElement | null) => void;
}) {
  return (
    <div
      className={`act2-library__book-page act2-library__book-page--${which} act2-library__book-page--flow act2-library__book-page--tale`}
      ref={pageRef}
    >
      <article className="act2-library__endmatter-body">
        <p className="act2-library__tale-contrast" data-measure-contrast>对照：测量用对照行 · 卷末第十页</p>
        <header data-measure-header>
          <p>道光 · 卷末第七页</p>
          <h3 className="act2-library__book-heading">测量标题</h3>
        </header>
        <p className="act2-library__tale-cont" data-measure-cont>续 1/3</p>
        <div className="act2-library__page-text act2-tales__original" data-measure-text />
        {withTab ? <span className="act2-library__support-tab" aria-hidden="true">说明与片段</span> : null}
      </article>
    </div>
  );
}

/**
 * Pack tale faces from the real laid-out page-text box after fonts are ready.
 * The title / 对照 line lives outside that box. Character-count estimates are
 * only used when the book has no measurable layout (jsdom).
 */
export function useMeasuredTaleChunks(
  paragraphs: readonly string[] | undefined,
  zoom: number,
  packKey: string,
): { faces: string[][]; spreads: TaleSpreadPlan[]; measureBench: ReactNode } {
  const bookRef = useRef<HTMLElement | null>(null);
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const fontSize = 16 * zoom;
  const estimated = useMemo(
    () => estimateTaleChunks(paragraphs ?? [], fontSize),
    [paragraphs, fontSize, packKey],
  );
  const [measured, setMeasured] = useState<{ key: string; faces: string[][]; dual: boolean } | null>(null);
  const packedLayoutRef = useRef({ key: '', width: 0, height: 0 });

  const packFromBench = (force = false) => {
    const paras = paragraphs ?? [];
    const key = `${packKey}:${fontSize}:${paras.length}`;
    const commit = (faces: string[][], dual = false) => {
      setMeasured((current) => {
        if (current && current.key === key && current.dual === dual && sameFaces(current.faces, faces)) return current;
        return { key, faces, dual };
      });
    };
    if (paras.length === 0) {
      commit([[]], false);
      return;
    }
    const liveBook = bookRef.current
      ?.closest('.act2-library')
      ?.querySelector<HTMLElement>('.act2-library__book:not(.act2-library__measure-book)');
    const benchBook = bookRef.current;
    const rightPage = rightRef.current;
    const leftPage = leftRef.current;
    if (liveBook && benchBook) {
      syncBenchToLiveBook(liveBook, benchBook);
      syncBenchTextWidths(liveBook, leftPage, rightPage);
    }
    const rightText = rightPage?.querySelector<HTMLElement>('[data-measure-text]');
    const leftText = leftPage?.querySelector<HTMLElement>('[data-measure-text]');
    const rightReady = Boolean(rightText && rightText.clientHeight >= 24 && rightText.clientWidth >= 24);
    const leftReady = Boolean(leftText && leftText.clientHeight >= 24 && leftText.clientWidth >= 24);
    if (!rightReady || !rightPage) {
      setMeasured((current) => current && current.key === key ? current : current ?? { key, faces: estimated, dual: false });
      return;
    }

    const boxWidth = rightText?.clientWidth ?? 0;
    const boxHeight = rightText?.clientHeight ?? 0;
    if (
      !force
      && packedLayoutRef.current.key === key
      && packedLayoutRef.current.width === boxWidth
      && packedLayoutRef.current.height === boxHeight
    ) {
      return;
    }
    packedLayoutRef.current = { key, width: boxWidth, height: boxHeight };

    const fits = (slice: readonly string[], kind: TaleFaceKind) => {
      const root = kind === 'cont-left' && leftReady && leftPage ? leftPage : rightPage;
      const text = fillBench(root, kind, slice, fontSize);
      return Boolean(text && !faceOverflows(text));
    };

    const rightOnly = packParagraphsUntil(paras, fits, ['first-right', 'first-right', 'first-right', 'first-right', 'first-right', 'first-right']);
    const first = rightOnly[0] ?? [];
    const rest = packParagraphsUntil(paras.slice(first.length), fits, ['cont-left', 'cont-right', 'cont-left', 'cont-right', 'cont-left', 'cont-right']);
    const dualFaces = [first, ...rest];
    const pairedSpreads = layoutTaleSpreads(rightOnly, false).length;
    const dualSpreads = layoutTaleSpreads(dualFaces, true).length;
    // Prefer dual continuations when they cut the number of turns, or when right-only would exceed three faces.
    if (rightOnly.length > 3 || dualSpreads < pairedSpreads) {
      commit(dualFaces, true);
      return;
    }
    commit(rightOnly, false);
  };

  useLayoutEffect(() => {
    let cancelled = false;
    packFromBench();
    const run = async () => {
      try {
        if (typeof document !== 'undefined' && document.fonts?.ready) await document.fonts.ready;
      } catch {
        // fonts.ready is best-effort
      }
      if (cancelled) return;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      if (!cancelled) packFromBench(true);
    };
    const rightText = rightRef.current?.querySelector<HTMLElement>('[data-measure-text]');
    const hasLayout = Boolean(rightText && rightText.clientHeight >= 24 && rightText.clientWidth >= 24);
    if (hasLayout) void run();
    const liveBook = bookRef.current
      ?.closest('.act2-library')
      ?.querySelector('.act2-library__book:not(.act2-library__measure-book)');
    const isJudgmentOpen = () => Boolean(
      bookRef.current?.closest('.act2-library')?.classList.contains('act2-library--judgment-open'),
    );
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      // Drawer scale is a pure transform; do not re-pack while it is open.
      if (!cancelled && !isJudgmentOpen()) packFromBench();
    });
    if (liveBook) observer?.observe(liveBook);
    if (rightRef.current) observer?.observe(rightRef.current);
    const onFonts = () => { if (!cancelled && !isJudgmentOpen()) packFromBench(true); };
    const onViewportResize = () => { if (!cancelled) packFromBench(true); };
    document.fonts?.addEventListener?.('loadingdone', onFonts);
    window.addEventListener('resize', onViewportResize);
    return () => {
      cancelled = true;
      observer?.disconnect();
      document.fonts?.removeEventListener?.('loadingdone', onFonts);
      window.removeEventListener('resize', onViewportResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packKey, fontSize, paragraphs, estimated]);

  const currentKey = `${packKey}:${fontSize}:${(paragraphs ?? []).length}`;
  const faces = measured && measured.key === currentKey ? measured.faces : estimated;
  const dual = Boolean(measured && measured.key === currentKey && measured.dual);
  const spreads = useMemo(() => layoutTaleSpreads(faces, dual), [faces, dual]);

  const measureBench = (
    <div className="act2-library__measure-bench" aria-hidden="true">
      <article className="act2-library__book act2-library__measure-book" ref={bookRef}>
        <div className="act2-library__book-leaves">
          <MeasureFace which="left" withTab={false} pageRef={(node) => { leftRef.current = node; }} />
          <MeasureFace which="right" withTab pageRef={(node) => { rightRef.current = node; }} />
        </div>
      </article>
    </div>
  );

  return { faces, spreads, measureBench };
}
