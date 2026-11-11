import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactElement } from 'react';
import libraryPanoramaUrl from '../../../public/assets/library/07-library-panorama-v2.jpg?url&no-inline';
import libraryShelfTextureUrl from '../../../public/assets/library/02-shelf-closeup.jpg?url&no-inline';
import { InvestigationShell } from '../../components/investigation/InvestigationShell';
import type { InvestigationAction } from '../../components/investigation/types';
import { stateManager, type StateManager } from '../../core/stateManager';
import { useAppSelector } from '../../core/hooks/useAppSelector';
import { equalAct2LibrarySnapshot, selectAct2LibrarySnapshot } from '../../core/store/selectors';
import {
  libraryCompletion,
  libraryCorrectSectionId,
  libraryExcerpt,
  libraryFlagIds,
  libraryKeywordsByPageId,
  libraryPageById,
  libraryPagesByVolumeId,
  librarySceneCopy,
  librarySections,
  libraryTargetPageId,
  libraryVolumes,
  type LibraryPage,
  type LibraryVolume,
} from '../../data/act2LibraryData';
import { act2Tales, taleById, taleEvidenceById, tales } from '../../data/act2TalesData';
import {
  BOOK_LEAF_TOTAL,
  ENDMATTER_DIVIDER_TITLE,
  ENDMATTER_SPREADS,
  FENGTUZHI_MISSING_CHAPTERS,
  FENGTUZHI_TOC_PAGE_ID,
  FENGTUZHI_VOLUME_ID,
  SHOW_FENGTUZHI_MISSING_PAGES,
  countDistinctTaleSources,
  endmatterIndexForTale,
  findSpreadIndexForParagraph,
  formatLeafFooter,
  formatTocLeafLabel,
  frontLeaves,
  initialEndmatterIndex,
  leafNumberForRecord,
  leavesForEndmatterSpread,
  taleIdsOnSpread,
} from './libraryEndmatter';
import { useMeasuredTaleChunks } from './useMeasuredTaleChunks';
import '../../act2/t03Library.css';
import '../../act2/t04Tales.css';
import '../../design/library-spacing.css';
import '../../design/library-gazette.css';

/** 放大倍率：组件瞬时状态，明确上下界与步进。 */
export const LIBRARY_MIN_ZOOM = 1;
export const LIBRARY_MAX_ZOOM = 2;
export const LIBRARY_ZOOM_STEP = 0.25;

export const LIBRARY_PANORAMA_SRC = libraryPanoramaUrl;
export const LIBRARY_SHELF_TEXTURE_SRC = libraryShelfTextureUrl;
export const LIBRARY_MOTION_MS = 500;

const clampZoom = (value: number): number =>
  Math.min(LIBRARY_MAX_ZOOM, Math.max(LIBRARY_MIN_ZOOM, Math.round(value * 100) / 100));

export const isLibraryVolumePullable = (volumeId: string, lockedVolumeIds: readonly string[] = []): boolean =>
  libraryVolumes.some((volume) => volume.id === volumeId) && !lockedVolumeIds.includes(volumeId);

const readReducedMotion = (): boolean => {
  try {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  } catch {
    return false;
  }
};

interface SpreadSide {
  heading?: string;
  spine?: string;
  showVolumeTitle?: boolean;
  paragraphs: string[];
}

/** 把一卷的某一数据页分配到左右书页，不改动原文。 */
export function spreadForPage(volume: LibraryVolume, page: LibraryPage): { left: SpreadSide; right: SpreadSide } {
  const paras = page.paragraphs;
  if (page.pageNumber === 1) {
    return {
      left: { showVolumeTitle: true, spine: volume.spine, paragraphs: [] },
      right: {
        heading: page.heading !== volume.title ? page.heading : undefined,
        paragraphs: paras,
      },
    };
  }
  if (paras.length >= 4) {
    const split = Math.ceil(paras.length / 2);
    return {
      left: { heading: page.heading, paragraphs: paras.slice(0, split) },
      right: { paragraphs: paras.slice(split) },
    };
  }
  return {
    left: { heading: page.heading, paragraphs: [] },
    right: { paragraphs: paras },
  };
}

const SPINE_CALL_MARKS: Record<string, string> = {
  VOLUME_A2_T03_001: '地·一',
  VOLUME_A2_T03_002: '传·九',
  VOLUME_A2_T03_003: '祠·四',
};

/** 展示层把半角 XX 收成竖排合体，不改数据文字。 */
export function VerticalCluster({ text, className, id }: { text: string; className?: string; id?: string }) {
  const parts = text.split(/(XX)/g);
  return (
    <span id={id} className={className}>
      {parts.map((part, index) => (
        part === 'XX'
          ? <span key={index} className="act2-library__letter-cluster">XX</span>
          : <span key={index}>{part}</span>
      ))}
    </span>
  );
}

/** 把摘录正文拆成出处行与按句断行，不改写入笔记的原文。 */
export function excerptDisplayParts(content: string): { source?: string; sentences: string[] } {
  const blocks = content.trim().split(/\n+/);
  const hasSource = blocks.length > 1;
  const source = hasSource ? blocks[0] : undefined;
  const body = (hasSource ? blocks.slice(1).join('') : blocks[0] ?? '').trim();
  const sentences = body.split(/(?<=。)/).map((part) => part.trim()).filter(Boolean);
  return { source, sentences: sentences.length > 0 ? sentences : (body ? [body] : []) };
}

function BayFillers({ sectionIndex, seed, count }: { sectionIndex: number; seed: number; count: number }) {
  return (
    <div className="act2-library__fillers" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const n = seed + i;
        const width = 14 + ((sectionIndex * 5 + n * 7) % 8);
        const height = 80 + ((sectionIndex * 7 + n * 5) % 11);
        return (
          <span
            key={n}
            className={`act2-library__filler act2-library__filler--${(sectionIndex + n) % 5} act2-library__filler--bands-${1 + (n % 2)}`}
            style={{ width: `${width}px`, flexBasis: `${width}px`, height: `${height}%` }}
          />
        );
      })}
    </div>
  );
}

export interface LibraryResearchProps {
  /** 允许测试注入隔离的 StateManager；缺省使用全局单例。 */
  manager?: StateManager;
  /** 明确的返回桌面出口。 */
  onReturnToDesktop?: () => void;
  /** Optional local-preview image source; the regular game always uses the registered panorama. */
  shelfImageSrc?: string;
  /** Preview-only: force these volume ids into the recessed, unpullable treatment. Production omits this. */
  lockedVolumeIds?: readonly string[];
}

/**
 * 第二幕 T03：县图书馆地方志检索。
 * 只通过冻结的 StateManager 方法推进状态；故事 Flag 由本内容控制器在对应节点写入。
 */

function LibraryToolIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LibraryResearch({
  manager = stateManager,
  onReturnToDesktop,
  shelfImageSrc,
  lockedVolumeIds = [],
}: LibraryResearchProps) {
  const state = useAppSelector(manager, selectAct2LibrarySnapshot, equalAct2LibrarySnapshot);
  const stage = state.modules.act2Research.stage;
  const library = state.modules.act2Research.library;
  const flags = state.game.flags;
  const [zoom, setZoom] = useState(LIBRARY_MIN_ZOOM);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(() =>
    library.visitedSectionIds.includes(libraryCorrectSectionId) ? libraryCorrectSectionId : null,
  );
  const [view, setView] = useState<'panorama' | 'shelf' | 'reader'>(() => (
    stage === 'tales' || library.currentPageId ? 'reader' : 'panorama'
  ));
  const [visualPageId, setVisualPageId] = useState<string | null>(library.currentPageId);
  const [endmatterIndex, setEndmatterIndex] = useState<number | null>(() => (
    stage === 'tales' ? initialEndmatterIndex(state.modules.act2Research.tales.readTaleIds) : null
  ));
  const [reducedMotion, setReducedMotion] = useState(readReducedMotion);
  const [pageTurnDir, setPageTurnDir] = useState<'prev' | 'next' | null>(null);
  const [excerptOpen, setExcerptOpen] = useState(false);
  const [excerptToast, setExcerptToast] = useState<string | null>(null);
  const [drawerPanel, setDrawerPanel] = useState<'excerpt' | 'keywords'>('excerpt');
  const [missingChapterIndex, setMissingChapterIndex] = useState<number | null>(null);
  const [catalogHint, setCatalogHint] = useState<string | null>(null);
  const [judgmentOpen, setJudgmentOpen] = useState(false);
  const [judgmentFit, setJudgmentFit] = useState(false);
  const [judgmentShift, setJudgmentShift] = useState(0);
  const [inferenceStatus, setInferenceStatus] = useState('');
  const [pendingEvidenceFocusTaleId, setPendingEvidenceFocusTaleId] = useState<string | null>(null);
  const [taleSpreadIndex, setTaleSpreadIndex] = useState(0);
  const taleAnchorRef = useRef<string | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [finishedTaleIds, setFinishedTaleIds] = useState<string[]>([]);
  const pageTurnTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const excerptTabRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const lastEndmatterIndexRef = useRef<number | null>(endmatterIndex);
  const hintTimerRef = useRef<number | null>(null);

  const enteredFlag = flags[libraryFlagIds.entered] === true;
  const bumuzhiFlag = flags[libraryFlagIds.bumuzhiFound] === true;
  const ruleKnown = flags[libraryFlagIds.ruleKnown] === true;

  useEffect(() => {
    if (stage !== 'library' || enteredFlag) return;
    manager.setFlag(libraryFlagIds.entered, true);
  }, [manager, stage, enteredFlag]);

  const resolvedPageId = visualPageId ?? library.currentPageId;
  const targetPageActive = stage === 'library' && endmatterIndex === null && missingChapterIndex === null && library.currentPageId === libraryTargetPageId;
  useEffect(() => {
    if (!targetPageActive || bumuzhiFlag) return;
    manager.readAct2GazetteTargetPage();
  }, [manager, targetPageActive, bumuzhiFlag]);

  useEffect(() => {
    if (stage === 'library' && library.currentPageId) setVisualPageId(library.currentPageId);
  }, [stage, library.currentPageId]);

  const talesProgress = state.modules.act2Research.tales;
  const visibleTaleIds = taleIdsOnSpread(endmatterIndex === null ? undefined : ENDMATTER_SPREADS[endmatterIndex]);
  useEffect(() => {
    if (stage !== 'tales') return;
    for (const taleId of visibleTaleIds) {
      if (!talesProgress.readTaleIds.includes(taleId)) manager.readAct2Tale(taleId);
    }
  }, [manager, stage, endmatterIndex, talesProgress.readTaleIds, visibleTaleIds.join('|')]);

  useEffect(() => {
    if (endmatterIndex !== null) lastEndmatterIndexRef.current = endmatterIndex;
  }, [endmatterIndex]);


  useEffect(() => {
    if (endmatterIndex !== null) setTaleSpreadIndex(0);
  }, [endmatterIndex]);

  useLayoutEffect(() => {
    if (!pendingEvidenceFocusTaleId) return;
    if (endmatterIndex !== endmatterIndexForTale(pendingEvidenceFocusTaleId)) return;
    if (!supportOpen) {
      setSupportOpen(true);
      return;
    }
    const tale = taleById.get(pendingEvidenceFocusTaleId);
    const evidenceId = tale?.evidence?.find((evidence) => !state.modules.act2Research.tales.supportingEvidenceIds.includes(evidence.id))?.id;
    if (!evidenceId) { setPendingEvidenceFocusTaleId(null); return; }
    const button = readerRef.current?.querySelector<HTMLButtonElement>(`[data-evidence-id="${evidenceId}"] button`);
    button?.focus({ preventScroll: true });
    setPendingEvidenceFocusTaleId(null);
  }, [pendingEvidenceFocusTaleId, supportOpen, endmatterIndex, state.modules.act2Research.tales.supportingEvidenceIds]);

  useEffect(() => {
    const media = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : undefined;
    const sync = () => setReducedMotion(readReducedMotion());
    sync();
    media?.addEventListener?.('change', sync);
    return () => media?.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => () => {
    if (pageTurnTimerRef.current !== null) window.clearTimeout(pageTurnTimerRef.current);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    if (hintTimerRef.current !== null) window.clearTimeout(hintTimerRef.current);
  }, []);

  useEffect(() => {
    if (!excerptOpen && !judgmentOpen && !supportOpen) return;
    const drawer = drawerRef.current;
    const previous = document.activeElement as HTMLElement | null;
    if (!pendingEvidenceFocusTaleId) drawerCloseRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setExcerptOpen(false);
        setJudgmentOpen(false);
        setSupportOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !drawer) return;
      const focusable = [...drawer.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [excerptOpen, judgmentOpen, supportOpen]);

  const packingTale = endmatterIndex === null
    ? undefined
    : [ENDMATTER_SPREADS[endmatterIndex]?.left, ENDMATTER_SPREADS[endmatterIndex]?.right]
      .find((leaf) => leaf?.kind === 'tale' && leaf.record && taleById.has(leaf.record.id))?.record;
  const { faces: taleFaces, spreads: taleSpreads, measureBench } = useMeasuredTaleChunks(
    packingTale?.paragraphs,
    zoom,
    packingTale?.id ?? '',
  );
  const taleSpreadCount = Math.max(taleSpreads.length, 1);
  const clampedTaleSpread = Math.min(taleSpreadIndex, Math.max(0, taleSpreadCount - 1));
  const currentTaleSpread = taleSpreads[clampedTaleSpread];
  const visibleTaleParagraphs = [
    ...(currentTaleSpread?.left ?? []),
    ...(currentTaleSpread?.right ?? []),
  ];

  useEffect(() => {
    if (!packingTale) return;
    const paragraphs = packingTale.paragraphs ?? [];
    const last = paragraphs[paragraphs.length - 1];
    if (last && visibleTaleParagraphs.includes(last)) {
      setFinishedTaleIds((current) => current.includes(packingTale.id) ? current : [...current, packingTale.id]);
    }
  }, [packingTale, visibleTaleParagraphs.join('\u0000')]);

  useEffect(() => {
    if (!packingTale) {
      taleAnchorRef.current = null;
      return;
    }
    const first = visibleTaleParagraphs[0];
    if (first) taleAnchorRef.current = first;
  }, [packingTale?.id, taleSpreadIndex]);

  useEffect(() => {
    const anchor = taleAnchorRef.current;
    if (!anchor) return;
    const next = findSpreadIndexForParagraph(taleSpreads, anchor);
    if (next >= 0 && next !== taleSpreadIndex) setTaleSpreadIndex(next);
    // taleSpreadIndex is read to avoid a redundant set; user navigation must not re-anchor from stale spreads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taleSpreads]);


  useLayoutEffect(() => {
    if (!judgmentOpen) {
      setJudgmentFit(false);
      return undefined;
    }
    const update = () => {
      const stage = document.querySelector<HTMLElement>('.act2-library__reader-stage');
      const book = document.querySelector<HTMLElement>('.act2-library__book:not(.act2-library__measure-book)');
      if (!stage || !book) {
        setJudgmentFit(false);
        return;
      }
      const stageBox = stage.getBoundingClientRect();
      const drawerEl = document.querySelector('.act2-library__judgment-drawer');
      const drawerLeft = drawerEl
        ? drawerEl.getBoundingClientRect().left
        : stageBox.right - Math.min(520, stageBox.width * 0.96);
      const remaining = Math.max(0, drawerLeft - stageBox.left);
      const scaledW = book.offsetWidth * 0.8;
      const scaledH = book.offsetHeight * 0.8;
      const fits = scaledW <= remaining && scaledH + 8 <= stageBox.height;
      setJudgmentFit(fits);
      if (fits) {
        const naturalCenter = stageBox.left + stageBox.width / 2;
        const wantedCenter = stageBox.left + remaining / 2;
        setJudgmentShift(wantedCenter - naturalCenter);
      } else {
        setJudgmentShift(0);
      }
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    const stage = document.querySelector('.act2-library__reader-stage');
    if (stage) observer?.observe(stage);
    return () => observer?.disconnect();
  }, [judgmentOpen]);

  if (stage !== 'library' && stage !== 'tales') return null;
  const panoramaSource = shelfImageSrc ?? LIBRARY_PANORAMA_SRC;

  const currentPage = resolvedPageId ? libraryPageById.get(resolvedPageId) ?? null : null;
  const gazetteVolume = currentPage ? libraryVolumes.find((volume) => volume.id === currentPage.volumeId) ?? null : null;
  const endmatterActive = endmatterIndex !== null;
  const missingActive = missingChapterIndex !== null;
  const missingChapter = missingActive ? FENGTUZHI_MISSING_CHAPTERS[missingChapterIndex] ?? null : null;
  const endmatterSpread = endmatterActive ? ENDMATTER_SPREADS[endmatterIndex] ?? null : null;
  const currentVolume = (endmatterActive || missingActive)
    ? libraryVolumes.find((volume) => volume.id === FENGTUZHI_VOLUME_ID) ?? gazetteVolume
    : gazetteVolume;
  const volumePages = currentVolume ? libraryPagesByVolumeId.get(currentVolume.id) ?? [] : (currentPage ? libraryPagesByVolumeId.get(currentPage.volumeId) ?? [] : []);
  const currentIndex = currentPage && !endmatterActive && !missingActive ? volumePages.findIndex((page) => page.id === currentPage.id) : -1;
  const isFengtuzhi = currentVolume?.id === FENGTUZHI_VOLUME_ID;
  const endmatterUnlocked = isFengtuzhi && ruleKnown;
  const atTocPage = !endmatterActive && !missingActive && currentPage?.id === FENGTUZHI_TOC_PAGE_ID;
  const atBumuzhiPage = !endmatterActive && !missingActive && currentPage?.id === libraryTargetPageId;
  const atJuanshouPage = !endmatterActive && !missingActive && isFengtuzhi && currentIndex === 0;
  const currentLeaves = endmatterActive
    ? leavesForEndmatterSpread(endmatterSpread ?? undefined)
    : missingActive
      ? frontLeaves('missing')
      : atTocPage
        ? frontLeaves('toc')
        : atBumuzhiPage
          ? frontLeaves('bumuzhi')
          : atJuanshouPage
            ? frontLeaves('juanshou')
            : currentIndex >= 0
              ? [currentIndex + 1]
              : [];
  const totalSpreadCount = isFengtuzhi ? BOOK_LEAF_TOTAL : volumePages.length;
  const displayPageNumber = currentLeaves[0] ?? 1;
  const pageIndicatorText = formatLeafFooter(currentLeaves, totalSpreadCount);
  const endmatterTaleRecord = endmatterSpread
    ? [endmatterSpread.left, endmatterSpread.right].find((leaf) => leaf.kind === 'tale' && leaf.record && taleById.has(leaf.record.id))?.record
    : undefined;
  const gazettePrevPage = currentIndex > 0 ? volumePages[currentIndex - 1] : null;
  const gazetteNextPage = currentIndex >= 0 && currentIndex < volumePages.length - 1 ? volumePages[currentIndex + 1] : null;
  const canPrevPage = (endmatterActive && (endmatterIndex > 0 || clampedTaleSpread > 0 || Boolean(volumePages[volumePages.length - 1])))
    || missingActive
    || Boolean(gazettePrevPage)
    || (atBumuzhiPage && SHOW_FENGTUZHI_MISSING_PAGES);
  const canNextPage = endmatterActive
    ? endmatterIndex < ENDMATTER_SPREADS.length - 1 || clampedTaleSpread < taleSpreadCount - 1
    : missingActive
      ? true
      : atTocPage && SHOW_FENGTUZHI_MISSING_PAGES
        ? true
        : Boolean(gazetteNextPage) || (endmatterUnlocked && currentIndex === volumePages.length - 1);
  const spread = !endmatterActive && !missingActive && currentPage && currentVolume ? spreadForPage(currentVolume, currentPage) : null;
  const readerInstruction = endmatterActive
    ? endmatterIndex === 0
      ? '已翻到卷末乡录残页。可按原次对照旧录与志异，或回看《补母志》。'
      : `正在阅读卷末第 ${endmatterIndex} 组记载，共 ${ENDMATTER_SPREADS.length - 1} 组；可继续翻页或回看。`
    : currentPage
    ? volumePages.length === 1
      ? '当前卷册只有一页，已经读到末页。可以回到目录或选择另一册。'
      : atJuanshouPage
        ? '正在阅读卷首；可以翻到下一页继续。'
        : atTocPage
          ? '正在阅读本卷目次；可以按页序继续翻阅。'
          : currentIndex === volumePages.length - 1 && !endmatterUnlocked
          ? `当前卷册共 ${volumePages.length} 页，正在阅读第 ${currentIndex + 1} 页，已到末页；可以回看上一页或回到目录。`
          : currentIndex === volumePages.length - 1
            ? `当前卷册共 ${totalSpreadCount} 页，正在阅读第 ${currentLeaves[0]}–${currentLeaves[currentLeaves.length - 1]} 页；可翻到卷末乡录残页。`
            : `当前卷册共 ${totalSpreadCount} 页，正在阅读第 ${displayPageNumber} 页；可按页序继续阅读。`
    : librarySceneCopy.readerInstruction;

  const keywords = currentPage && !endmatterActive && !missingActive ? libraryKeywordsByPageId.get(currentPage.id) ?? [] : [];
  const markedKeywordIds = library.markedKeywordIds;
  const bookmarked = currentPage && !endmatterActive && !missingActive ? library.bookmarkedPageIds.includes(currentPage.id) : false;
  const excerpted = library.excerptedEntryIds.includes(libraryExcerpt.entryId);
  const selectedSourceCount = countDistinctTaleSources(talesProgress.supportingEvidenceIds, taleEvidenceById);
  const hasJudgment = talesProgress.inferenceAcknowledged;
  const inferenceReady = selectedSourceCount >= 2 && talesProgress.selectedInferenceId !== null;
  const showShellAction = stage === 'library' && ruleKnown && view !== 'reader';
  const showReaderCta = stage === 'library' && ruleKnown && excerpted && view === 'reader' && !excerptOpen && !endmatterActive;
  const allTaleChunksFinished = tales.every((tale) => finishedTaleIds.includes(tale.id));
  const showJudgmentCta = stage === 'tales' && allTaleChunksFinished && !judgmentOpen;
  const excerptParts = excerptDisplayParts(libraryExcerpt.content);
  const drawerOpen = excerptOpen || judgmentOpen || supportOpen;

  const playPageTurnMotion = (dir: 'prev' | 'next') => {
    if (pageTurnTimerRef.current !== null) window.clearTimeout(pageTurnTimerRef.current);
    setPageTurnDir(dir);
    pageTurnTimerRef.current = window.setTimeout(() => {
      setPageTurnDir(null);
      pageTurnTimerRef.current = null;
    }, reducedMotion ? 0 : LIBRARY_MOTION_MS);
  };

  const openVisualGazettePage = (pageId: string, persist = true) => {
    setEndmatterIndex(null);
    setMissingChapterIndex(null);
    setVisualPageId(pageId);
    if (persist && stage === 'library') manager.openGazettePage(pageId);
  };

  const showCatalogHint = (message: string) => {
    setCatalogHint(message);
    if (hintTimerRef.current !== null) window.clearTimeout(hintTimerRef.current);
    hintTimerRef.current = window.setTimeout(() => {
      setCatalogHint(null);
      hintTimerRef.current = null;
    }, reducedMotion ? 2000 : 2000);
  };

  const goToCatalog = () => {
    playPageTurnMotion('prev');
    openVisualGazettePage(FENGTUZHI_TOC_PAGE_ID);
    setView('reader');
  };

  const enterEndmatter = (index = 0) => {
    if (!ruleKnown && stage !== 'tales') return;
    setExcerptOpen(false);
    setJudgmentOpen(false);
    setSupportOpen(false);
    setTaleSpreadIndex(0);
    setMissingChapterIndex(null);
    if (stage === 'library') manager.setAct2Stage('tales');
    const lastGazette = libraryPagesByVolumeId.get(FENGTUZHI_VOLUME_ID)?.[libraryPagesByVolumeId.get(FENGTUZHI_VOLUME_ID)!.length - 1];
    if (lastGazette) setVisualPageId(lastGazette.id);
    setEndmatterIndex(index);
    setView('reader');
  };

  const goToRecordSpread = (recordId: string) => {
    const index = ENDMATTER_SPREADS.findIndex((spread) => spread.left.record?.id === recordId || spread.right.record?.id === recordId);
    if (index < 0) return;
    enterEndmatter(index);
  };

  const goToTaleSpread = (taleId: string) => {
    if (!ruleKnown && stage !== 'tales') {
      setMissingChapterIndex(null);
      setEndmatterIndex(null);
      openVisualGazettePage(libraryTargetPageId, false);
      showCatalogHint('先读补母志');
      setView('reader');
      return;
    }
    goToRecordSpread(taleId);
  };

  const goToBumuzhi = () => {
    openVisualGazettePage(libraryTargetPageId, true);
    setView('reader');
  };

  const goToMissingChapter = (index: number) => {
    setEndmatterIndex(null);
    setMissingChapterIndex(index);
    setView('reader');
  };

  const goPrevPage = () => {
    if (drawerOpen) return;
    if (endmatterActive) {
      playPageTurnMotion('prev');
      if (clampedTaleSpread > 0) {
        setTaleSpreadIndex(clampedTaleSpread - 1);
        return;
      }
      if (endmatterIndex > 0) {
        setEndmatterIndex(endmatterIndex - 1);
        return;
      }
      const lastGazette = volumePages[volumePages.length - 1];
      if (lastGazette) {
        setEndmatterIndex(null);
        setVisualPageId(lastGazette.id);
      }
      return;
    }
    if (missingActive) {
      playPageTurnMotion('prev');
      setMissingChapterIndex(null);
      openVisualGazettePage(FENGTUZHI_TOC_PAGE_ID);
      return;
    }
    if (atBumuzhiPage && SHOW_FENGTUZHI_MISSING_PAGES) {
      playPageTurnMotion('prev');
      goToMissingChapter(0);
      return;
    }
    if (!gazettePrevPage) return;
    playPageTurnMotion('prev');
    openVisualGazettePage(gazettePrevPage.id);
  };

  const goNextPage = () => {
    if (drawerOpen || !canNextPage) return;
    playPageTurnMotion('next');
    if (endmatterActive) {
      if (clampedTaleSpread < taleSpreadCount - 1) {
        setTaleSpreadIndex(clampedTaleSpread + 1);
        return;
      }
      if (endmatterIndex < ENDMATTER_SPREADS.length - 1) setEndmatterIndex(endmatterIndex + 1);
      return;
    }
    if (missingActive) {
      setMissingChapterIndex(null);
      openVisualGazettePage(libraryTargetPageId, true);
      return;
    }
    if (atTocPage && SHOW_FENGTUZHI_MISSING_PAGES) {
      goToMissingChapter(0);
      return;
    }
    if (gazetteNextPage) {
      openVisualGazettePage(gazetteNextPage.id);
      return;
    }
    enterEndmatter(0);
  };

  const onReaderKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (drawerOpen) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goPrevPage();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goNextPage();
    }
  };

  const visitSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    if (stage === 'library') {
      manager.visitGazetteSection(sectionId);
      if (sectionId === libraryCorrectSectionId && manager.getState().game.flags[libraryFlagIds.gazetteFound] !== true) {
        manager.setFlag(libraryFlagIds.gazetteFound, true);
      }
    }
  };

  const enterReader = () => {
    setView('reader');
  };

  const openVolume = (volumeId: string) => {
    const volume = libraryVolumes.find((item) => item.id === volumeId);
    if (!volume || !isLibraryVolumePullable(volumeId, lockedVolumeIds)) return;
    visitSection(volume.sectionId);
    const firstPage = libraryPagesByVolumeId.get(volumeId)?.[0];
    if (stage === 'library') {
      manager.openGazetteVolume(volumeId);
      if (firstPage) manager.openGazettePage(firstPage.id);
    }
    if (firstPage) setVisualPageId(firstPage.id);
    setMissingChapterIndex(null);
    if (volumeId === FENGTUZHI_VOLUME_ID && stage === 'tales' && lastEndmatterIndexRef.current !== null) {
      setEndmatterIndex(lastEndmatterIndexRef.current);
    } else {
      setEndmatterIndex(null);
    }
    enterReader();
  };

  const enterShelf = () => {
    setView('shelf');
  };

  const leaveShelf = () => {
    setView('panorama');
  };

  const closeReader = () => {
    setExcerptOpen(false);
    setJudgmentOpen(false);
    setSupportOpen(false);
    setView('shelf');
  };

  const goToTales = () => enterEndmatter(0);

  const openExcerptDrawer = () => {
    setDrawerPanel('excerpt');
    setExcerptOpen(true);
  };
  const closeExcerptDrawer = () => {
    setExcerptOpen(false);
    excerptTabRef.current?.focus();
  };

  const saveExcerpt = () => {
    if (!excerpted) manager.excerptGazetteEntry(libraryExcerpt.entryId);
    setExcerptOpen(false);
    setExcerptToast('\u2713 已记入调查笔记');
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setExcerptToast(null);
      toastTimerRef.current = null;
    }, 2000);
    excerptTabRef.current?.focus();
  };

  const volumeInBay = (sectionId: string): LibraryVolume | undefined =>
    libraryVolumes.find((volume) => volume.sectionId === sectionId);

  const chooseInference = (id: 'accompanied-change' | 'recovery-or-imitation' | 'complete-transfer') => {
    setInferenceStatus('');
    manager.selectAct2TaleInference(id);
  };
  const confirmInference = () => {
    if (!talesProgress.selectedInferenceId) return;
    const result = manager.inferAct2TransferPattern(talesProgress.selectedInferenceId);
    const messages = {
      blocked: '至少要从两篇不同的旧录中各选一条支持性片段，再确认暂定判断。',
      insufficient: '恢复或模仿能解释部分变化，但解释不了六儿留下的陌生姓名，或哑女出现的鸟鸣。这个说法还不够。',
      overclaim: '现有旧录只能显示获得之外伴随了陌生习惯或记忆，无法证明完整人格转移。',
      accepted: '暂时可以确认：获得之外，还伴随了原本不属于当事人的习惯或记忆。来源和机制仍不清楚。',
    };
    setInferenceStatus(messages[result]);
  };
  const openJudgmentDrawer = () => {
    setExcerptOpen(false);
    setSupportOpen(false);
    setJudgmentOpen(true);
  };
  const closeJudgmentDrawer = () => setJudgmentOpen(false);
  const openMaterial = (materialId: string) => {
    if (materialId.startsWith('TALE_')) {
      setJudgmentOpen(false);
      goToTaleSpread(materialId);
      setPendingEvidenceFocusTaleId(materialId);
    }
  };

  const actions: InvestigationAction[] = showShellAction ? [{
    actionId: 'A2_T03_TO_TALES', kind: 'story', target: 'tales', label: '继续对照三篇志异',
    state: 'ready',
    reason: '先在《补母志》目标页读完这段记载；阅读会自动登记来源。',
    onActivate: goToTales,
  }] : stage === 'tales' && hasJudgment ? [
    {
      actionId: 'A2_T04_TO_SCHOOL', kind: 'move', target: 'school', label: '前往高中调查',
      state: 'ready',
      reason: '暂定判断已记下，可以前往高中继续调查。',
      onActivate: () => manager.enterAct2School(),
    },
  ] : [];

  const focusCatalog = (_actionId?: string, materialId?: string) => {
    if (materialId) {
      openMaterial(materialId);
      return;
    }
    if (view === 'panorama') enterShelf();
    if (view === 'reader') closeReader();
    requestAnimationFrame(() => {
      const tab = document.querySelector<HTMLElement>(`[data-section-id="${libraryCorrectSectionId}"]`);
      tab?.focus();
      tab?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  };

  const rootClass = [
    'act2-library',
    `act2-library--view-${view}`,
    reducedMotion ? 'act2-library--reduced' : '',
    excerptOpen ? 'act2-library--excerpt-open' : '',
    judgmentOpen ? 'act2-library--judgment-open' : '',
    judgmentOpen && judgmentFit ? 'act2-library--judgment-fit' : '',
    supportOpen ? 'act2-library--excerpt-open act2-library--support-open' : '',
    (showReaderCta || showJudgmentCta) ? 'act2-library--has-afterword' : '',
    showJudgmentCta ? 'act2-library--afterword-compact' : '',
  ].filter(Boolean).join(' ');

  const renderInkCircle = (state: 'idle' | 'current' | 'read') => (
    <span className={`act2-library__ink-circle act2-library__ink-circle--${state}`} aria-hidden="true" />
  );

  const renderTocFrontPage = () => (
    <div className="act2-library__book-page act2-library__book-page--left act2-library__book-page--flow act2-library__book-page--toc">
      {currentVolume ? <h3 id="act2-library-book-title" className="act2-library__book-title-sr">{currentVolume.title}</h3> : null}
      <p className="act2-library__toc-kicker">卷首 · 正卷</p>
      {currentPage?.heading ? <h4 className="act2-library__book-heading">{currentPage.heading}</h4> : <h4 className="act2-library__book-heading">本卷目次</h4>}
      {currentPage && currentPage.paragraphs.length > 0 ? (
        <div className="act2-library__page-text act2-library__toc-printed">
          {currentPage.paragraphs.map((paragraph, index) => (
            <p key={`toc-printed-${index + 1}`}>{paragraph}</p>
          ))}
        </div>
      ) : null}
      <nav className="act2-library__toc-extra" aria-label="卷首与正卷目录">
        <ol>
          {SHOW_FENGTUZHI_MISSING_PAGES ? FENGTUZHI_MISSING_CHAPTERS.map((chapter) => (
            <li key={chapter.id}>
              <span className="act2-library__toc-static" data-missing-id={chapter.id}>
                <span className="act2-library__toc-line1">
                  <span>{chapter.title}</span>
                  <small>{formatTocLeafLabel(frontLeaves('missing'))}</small>
                </span>
                <small className="act2-library__toc-line2">本卷阙</small>
              </span>
            </li>
          )) : null}
          <li>
            <button
              type="button"
              className="act2-library__toc-link"
              data-toc-target="bumuzhi"
              onClick={goToBumuzhi}
            >
              <span className="act2-library__toc-line1">
                <span>补母志</span>
                <small>{formatTocLeafLabel(frontLeaves('bumuzhi'))}</small>
                <span className="act2-library__toc-arrow" aria-hidden="true">→</span>
              </span>
            </button>
          </li>
        </ol>
      </nav>
    </div>
  );

  const renderTocEndmatterPage = () => (
    <div className="act2-library__book-page act2-library__book-page--right act2-library__book-page--flow act2-library__book-page--toc">
      <h4 className="act2-library__book-heading">卷末 · 乡录残页</h4>
      {!ruleKnown ? <p className="act2-library__toc-note">圈出三篇，读完补母志后可翻</p> : null}
      <nav className="act2-library__toc-extra" aria-label="卷末乡录残页目录">
        <ol>
          {act2Tales.records.map((record) => {
            const isTale = taleById.has(record.id);
            const leaf = leafNumberForRecord(record);
            return (
              <li key={record.id}>
                <button
                  type="button"
                  className={`act2-library__toc-link act2-tales__record${isTale ? ' act2-tales__record--tale' : ''}${!ruleKnown ? ' act2-library__toc-link--locked' : ''}`}
                  data-tale-toc={isTale ? record.id : undefined}
                  data-record-toc={isTale ? undefined : record.id}
                  data-shelf-entry-id={record.id}
                  onClick={() => (isTale ? goToTaleSpread(record.id) : goToRecordSpread(record.id))}
                >
                  {isTale ? renderInkCircle(talesProgress.readTaleIds.includes(record.id) ? 'read' : 'idle') : <span className="act2-library__ink-spacer" aria-hidden="true" />}
                  <span className="act2-library__toc-rows">
                    <span className="act2-library__toc-line1">
                      <span>{record.title}</span>
                      <small>{leaf != null ? `第 ${leaf} 页` : ''}</small>
                      {ruleKnown ? <span className="act2-library__toc-arrow" aria-hidden="true">→</span> : null}
                    </span>
                    <small className="act2-library__toc-line2">{isTale ? '乡录残页' : record.era}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );

  const pairedRecord = endmatterSpread?.left.kind === 'record' ? endmatterSpread.left.record : undefined;

  const renderSupportTab = (withTab: boolean) => withTab ? (
    <button
      type="button"
      className="act2-library__support-tab"
      aria-label="现代文说明与选作支持片段"
      aria-expanded={supportOpen}
      onClick={() => { setJudgmentOpen(false); setExcerptOpen(false); setSupportOpen(true); }}
    >
      说明与片段
    </button>
  ) : null;

  const renderTaleFace = (
    which: 'left' | 'right',
    paragraphs: readonly string[],
    faceIndex: number,
    faceCount: number,
    variant: 'first-right' | 'cont-left' | 'cont-right',
    withTab: boolean,
  ): ReactElement => {
    const record = packingTale;
    if (!record) {
      return (
        <div className={`act2-library__book-page act2-library__book-page--${which}`}>
          {which === 'left' && currentVolume ? <h3 id="act2-library-book-title" className="act2-library__book-title-sr">{currentVolume.title}</h3> : null}
        </div>
      );
    }
    return (
      <div className={`act2-library__book-page act2-library__book-page--${which} act2-library__book-page--flow act2-library__book-page--tale`} data-tale-face={variant} data-face-index={faceIndex}>
        {which === 'left' && currentVolume ? <h3 id="act2-library-book-title" className="act2-library__book-title-sr">{currentVolume.title}</h3> : null}
        <article className="act2-library__endmatter-body" data-tale-id={record.id}>
          {variant === 'cont-left' ? (
            <p className="act2-library__tale-contrast">对照：{pairedRecord?.title ?? '对页旧录'} · {pairedRecord?.page ?? ''}</p>
          ) : variant === 'first-right' ? (
            <header>
              <p>{record.era} · {record.page}</p>
              <h3 className="act2-library__book-heading">{record.title}</h3>
            </header>
          ) : null}
          {faceCount > 1 ? <p className="act2-library__tale-cont">续 {faceIndex + 1}/{faceCount}</p> : null}
          <div className="act2-library__page-text act2-tales__original" style={{ fontSize: `${16 * zoom}px` }} aria-label="原文">
            {paragraphs.map((paragraph, index) => <p key={`${record.id}-f${faceIndex}-p${index + 1}`}>{paragraph}</p>)}
          </div>
          {renderSupportTab(withTab)}
        </article>
      </div>
    );
  };

  const renderEndmatterLeaf = (leaf: (typeof ENDMATTER_SPREADS)[number]['left'], which: 'left' | 'right'): ReactElement => {
    if (leaf.kind === 'divider') {
      return (
        <div className={`act2-library__book-page act2-library__book-page--${which} act2-library__book-page--divider`}>
          {currentVolume ? <h3 id="act2-library-book-title" className="act2-library__book-title-sr">{currentVolume.title}</h3> : null}
          <h4 className="act2-library__endmatter-title">{ENDMATTER_DIVIDER_TITLE}</h4>
        </div>
      );
    }
    if (leaf.kind === 'empty' || !leaf.record) {
      return (
        <div className={`act2-library__book-page act2-library__book-page--${which}`}>
          {which === 'left' && currentVolume ? <h3 id="act2-library-book-title" className="act2-library__book-title-sr">{currentVolume.title}</h3> : null}
        </div>
      );
    }
    const record = leaf.record;
    const isTale = leaf.kind === 'tale' && taleById.has(record.id);
    if (isTale && currentTaleSpread) {
      const faceIndex = currentTaleSpread.rightFaceIndex ?? 0;
      return renderTaleFace('right', currentTaleSpread.right, faceIndex, currentTaleSpread.faceCount, 'first-right', true);
    }
    return (
      <div className={`act2-library__book-page act2-library__book-page--${which} act2-library__book-page--flow${isTale ? ' act2-library__book-page--tale' : ' act2-library__book-page--record'}`}>
        {which === 'left' && currentVolume ? <h3 id="act2-library-book-title" className="act2-library__book-title-sr">{currentVolume.title}</h3> : null}
        <article className="act2-library__endmatter-body act2-library__endmatter-body--record" data-record-id={record.id}>
          <h3 className="act2-library__book-heading">{record.title}</h3>
          <p className="act2-library__endmatter-meta">{record.era} · {record.page}</p>
          <p>{record.summary}</p>
        </article>
      </div>
    );
  };

  const renderEndmatterSpreadPages = () => {
    if (!endmatterSpread) return null;
    if (packingTale && currentTaleSpread?.mode === 'dual') {
      const leftFace = currentTaleSpread.left ?? [];
      const leftIndex = currentTaleSpread.leftFaceIndex ?? 0;
      const hasRight = (currentTaleSpread.right?.length ?? 0) > 0;
      return (
        <>
          {renderTaleFace('left', leftFace, leftIndex, currentTaleSpread.faceCount, 'cont-left', !hasRight)}
          {hasRight
            ? renderTaleFace('right', currentTaleSpread.right, currentTaleSpread.rightFaceIndex ?? leftIndex, currentTaleSpread.faceCount, 'cont-right', true)
            : <div className="act2-library__book-page act2-library__book-page--right">{renderSupportTab(false)}</div>}
        </>
      );
    }
    return (
      <>
        {renderEndmatterLeaf(endmatterSpread.left, 'left')}
        {renderEndmatterLeaf(endmatterSpread.right, 'right')}
      </>
    );
  };

  const renderSide = (side: SpreadSide, which: 'left' | 'right') => {
    const flow = !side.showVolumeTitle && (side.paragraphs.length > 0 || Boolean(side.heading));
    const showInpageExcerpt = which === 'right' && atBumuzhiPage && library.currentPageId === libraryTargetPageId;
    return (
    <div className={`act2-library__book-page act2-library__book-page--${which}${flow ? ' act2-library__book-page--flow' : ''}`}>
      {side.showVolumeTitle && currentVolume ? (
        <h3 id="act2-library-book-title" className="act2-library__book-title">
          <VerticalCluster text={currentVolume.title} />
        </h3>
      ) : which === 'left' && currentVolume ? (
        <h3 id="act2-library-book-title" className="act2-library__book-title-sr">{currentVolume.title}</h3>
      ) : null}
      {side.spine ? <p className="act2-library__book-spine">{side.spine}</p> : null}
      {side.heading ? <h4 className="act2-library__book-heading">{side.heading}</h4> : null}
      {side.paragraphs.length > 0 ? (
        <div className="act2-library__page-text" style={{ fontSize: `${16 * zoom}px` }}>
          {side.paragraphs.map((paragraph, index) => (
            <p key={`${which}-p${index + 1}`}>{paragraph}</p>
          ))}
        </div>
      ) : null}
      {showInpageExcerpt ? (
        <button
          ref={excerptTabRef}
          type="button"
          className={`act2-library__inpage-excerpt${excerpted ? ' act2-library__inpage-excerpt--done' : ''}`}
          aria-label={excerpted ? '已摘录' : '摘录此段'}
          aria-expanded={excerpted ? undefined : excerptOpen}
          disabled={excerpted}
          onClick={excerpted ? undefined : openExcerptDrawer}
        >
          {excerpted ? '✓ 已摘录' : (
            <>
              <svg className="act2-library__inpage-excerpt-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path fill="currentColor" d="M12.1 1.4c.5-.5 1.3-.5 1.8 0l.7.7c.5.5.5 1.3 0 1.8l-8.8 8.8-3.2.7.7-3.2 8.8-8.8Zm-7.5 9.3-.2.9.9-.2 6.9-6.9-.7-.7-6.9 6.9Z" />
              </svg>
              摘录此段
            </>
          )}
        </button>
      ) : null}
    </div>
    );
  };

  return (
    <InvestigationShell
      ariaLabel={stage === 'tales' ? '三篇志异调查' : '县图书馆地方志调查'}
      className="investigation-shell--reading"
      actLabel="第二幕 · 民俗疑问"
      locationLabel="县图书馆阅览室"
      contextLabel={stage === 'tales' ? '地方志目录 · 卷册 · 卷末旧录' : '地方志目录 · 卷册 · 书页'}
      objective={stage === 'tales' ? '对照旧录里获得的能力与随之出现的变化，判断这些记载能支持到哪一步。' : '从县志里找到鸡公岭附近的旧俗记录，读清楚它描述了什么。'}
      helpText={stage === 'tales' ? '在《风土志》卷末按原次翻阅旧录与志异。读到志异页会自动登记来源；三篇都读过之后，再做出有边界的暂定判断。' : '点进查阅架后，对照目录签和书脊上的全称抽取卷册并逐页翻阅。读到《补母志》后，来源会自动记入笔记；关键词和书签可用于回看，不是额外通关清单。'}
      actions={actions}
      statusMessage={inferenceStatus}
      onExit={() => onReturnToDesktop?.()}
      onOpenMaterial={focusCatalog}
    >
    <section className={rootClass} aria-label={`${librarySceneCopy.title} · 地方志检索`} data-library-view={view} style={{ ['--lib-judgment-shift' as string]: `${judgmentShift}px` }} data-tale-faces={packingTale ? String(currentTaleSpread?.faceCount ?? taleFaces.length) : undefined} data-tale-spreads={packingTale ? String(taleSpreadCount) : undefined}>
      <div className="act2-library__stage">
        {view === 'panorama' && (
          <div className="act2-library__panorama">
            <img className="act2-library__panorama-image" src={panoramaSource} alt="县图书馆阅览室全景，书桌与灯光旁有一座可供查阅的大书架" />
            <button
              type="button"
              className="act2-library__consult"
              aria-label="走近查阅架"
              onClick={enterShelf}
            >
              <span className="act2-library__consult-label">查阅架</span>
            </button>
          </div>
        )}

        {(view === 'shelf') && (
          <div className="act2-library__shelf-view" aria-label="地方志查阅架">
            <div className="act2-library__shelf-toolbar">
              <button type="button" className="act2-library__leave" onClick={leaveShelf}>离开查阅架</button>
            </div>
            <div className="act2-library__bays" role="list" aria-label="查阅架格位">
              {librarySections.map((section, sectionIndex) => {
                const volume = volumeInBay(section.id);
                const pullable = volume ? isLibraryVolumePullable(volume.id, lockedVolumeIds) : false;
                const active = section.id === activeSectionId;
                const isLegend = Boolean(volume && section.isCorrect);
                return (
                  <div
                    key={section.id}
                    className={`act2-library__bay${volume ? '' : ' act2-library__bay--empty'}`}
                    role="listitem"
                    data-section-bay={section.id}
                    data-volume-id={volume?.id}
                  >
                    <div className="act2-library__bay-cavity">
                      <BayFillers sectionIndex={sectionIndex} seed={0} count={volume ? 3 : 6} />
                      {volume ? (
                        <button
                          type="button"
                          className={`act2-library__spine${pullable ? ' act2-library__spine--pullable' : ' act2-library__spine--locked'}${isLegend ? ' act2-library__spine--legend' : ''}`}
                          data-shelf-entry-id={volume.id}
                          data-volume-id={volume.id}
                          aria-label={pullable ? `抽取《${volume.title}》` : `《${volume.title}》尚未开放查阅`}
                          aria-disabled={pullable ? undefined : true}
                          disabled={!pullable}
                          onClick={() => openVolume(volume.id)}
                        >
                          <VerticalCluster text={volume.title} className="act2-library__spine-title" />
                          <span className="act2-library__spine-slip" aria-hidden="true">{SPINE_CALL_MARKS[volume.id] ?? ''}</span>
                        </button>
                      ) : null}
                      {volume ? <BayFillers sectionIndex={sectionIndex} seed={3} count={3} /> : null}
                    </div>
                    <div className="act2-library__bay-ledge" aria-hidden="true" />
                    <div className="act2-library__tab-slot">
                      <button
                        type="button"
                        className="act2-library__tab"
                        data-section-id={section.id}
                        aria-current={active ? 'true' : undefined}
                        aria-pressed={active}
                        aria-label={`目录签：${section.name}`}
                        onClick={() => visitSection(section.id)}
                      >
                        {section.name}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'reader' && currentVolume && (endmatterActive ? endmatterSpread : missingActive ? missingChapter : currentPage && spread) && (
          <div className="act2-library__reader-stage" tabIndex={0} onKeyDown={onReaderKeyDown} ref={readerRef}>
            <div className="act2-library__reader-backdrop" aria-hidden="true">
              <img src={panoramaSource} alt="" />
            </div>
            <div className="act2-library__reader-scrim" aria-hidden="true" />
            <div className="act2-library__reader-toolbar">
              <button type="button" className="act2-library__close-reader" aria-label="合上卷册，回到书架" onClick={closeReader}>合上卷册</button>
              {isFengtuzhi && !atTocPage ? (
                <button type="button" className="act2-library__to-catalog" onClick={goToCatalog}>回目录</button>
              ) : null}
              <div className="act2-library__tools act2-library__tools--quiet">
                <button
                  type="button"
                  className="act2-library__zoom-out"
                  aria-label="缩小"
                  disabled={zoom <= LIBRARY_MIN_ZOOM}
                  onClick={() => setZoom((value) => clampZoom(value - LIBRARY_ZOOM_STEP))}
                >
                  <LibraryToolIcon path="M7.5 10.5h6M16.2 16.2 20 20M10.5 18.5a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
                </button>
                <span className="act2-library__zoom-value" aria-live="polite">×{zoom.toFixed(2)}</span>
                <button
                  type="button"
                  className="act2-library__zoom-in"
                  aria-label="放大"
                  disabled={zoom >= LIBRARY_MAX_ZOOM}
                  onClick={() => setZoom((value) => clampZoom(value + LIBRARY_ZOOM_STEP))}
                >
                  <LibraryToolIcon path="M10.5 7.5v6M7.5 10.5h6M16.2 16.2 20 20M10.5 18.5a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
                </button>
                <button
                  type="button"
                  className="act2-library__bookmark"
                  aria-label={bookmarked ? '已加书签' : '加书签'}
                  aria-pressed={bookmarked}
                  disabled={endmatterActive || missingActive || !currentPage}
                  onClick={() => { if (currentPage && !endmatterActive && !missingActive) manager.toggleGazetteBookmark(currentPage.id); }}
                >
                  <LibraryToolIcon path="M7 4.5h10A1.5 1.5 0 0 1 18.5 6v14.2L12 16.4 5.5 20.2V6A1.5 1.5 0 0 1 7 4.5z" />
                </button>
              </div>
            </div>
            <p className="act2-library__reader-instruction">{readerInstruction}</p>
            <article
              className={`act2-library__page act2-library__book${pageTurnDir === 'next' ? ' act2-library__page--turning-next' : ''}${pageTurnDir === 'prev' ? ' act2-library__page--turning-prev' : ''}`}
              data-page-id={endmatterActive || missingActive ? undefined : currentPage?.id}
              data-volume-id={currentVolume.id}
              data-endmatter-index={endmatterActive ? String(endmatterIndex) : undefined}
              data-missing-id={missingActive && missingChapter ? missingChapter.id : undefined}
              aria-labelledby="act2-library-book-title"
            >
              <div className="act2-library__book-leaves">
                {endmatterActive && endmatterSpread
                  ? renderEndmatterSpreadPages()
                  : missingActive
                    ? <>
                        <div className="act2-library__book-page act2-library__book-page--left act2-library__book-page--flow act2-library__book-page--missing-list">
                          {currentVolume ? <h3 id="act2-library-book-title" className="act2-library__book-title-sr">{currentVolume.title}</h3> : null}
                          <ul className="act2-library__missing-chapters">
                            {FENGTUZHI_MISSING_CHAPTERS.map((chapter) => (
                              <li key={chapter.id}>{chapter.title} · 阙</li>
                            ))}
                          </ul>
                        </div>
                        <div className="act2-library__book-page act2-library__book-page--right act2-library__book-page--flow act2-library__book-page--missing">
                          <p className="act2-library__missing-note">以上三篇，本卷阙。</p>
                        </div>
                      </>
                    : atTocPage
                    ? <>
                        {renderTocFrontPage()}
                        {renderTocEndmatterPage()}
                      </>
                    : spread
                    ? <>
                        {renderSide(spread.left, 'left')}
                        {renderSide(spread.right, 'right')}
                      </>
                    : null}
              </div>
              <button
                type="button"
                className="act2-library__page-turn act2-library__page-turn--prev act2-library__prev"
                aria-label="翻到上一页（页角）"
                disabled={!canPrevPage}
                onClick={goPrevPage}
              >
                <span className="act2-library__page-turn-corner" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="act2-library__page-turn act2-library__page-turn--next act2-library__next"
                aria-label="翻到下一页（页角）"
                disabled={!canNextPage}
                onClick={goNextPage}
              >
                <span className="act2-library__page-turn-corner" aria-hidden="true" />
              </button>
              <p className="act2-library__page-indicator" aria-live="polite">{pageIndicatorText}</p>
            </article>
            {catalogHint ? (
              <p className="act2-library__toc-toast" role="status" aria-live="polite">{catalogHint}</p>
            ) : null}

            {!ruleKnown ? (
              <p className="act2-library__ambience">{librarySceneCopy.ambience}</p>
            ) : null}

            {showReaderCta && (
              <div className="act2-library__afterword">
                {excerptToast ? <p className="act2-library__excerpt-toast" role="status" aria-live="polite">{excerptToast}</p> : null}
                <div className="act2-library__conclusion">
                  <h2>{libraryCompletion.title}</h2>
                  <p className="act2-library__conclusion-line">{libraryCompletion.conclusion}</p>
                  <p className="act2-library__conclusion-detail">{libraryCompletion.detail}</p>
                </div>
                <button
                  type="button"
                  className="act2-library__story-cta"
                  data-action-id="A2_T03_TO_TALES"
                  data-action-state="ready"
                  onClick={goToTales}
                >
                  继续对照三篇志异
                </button>
              </div>
            )}

            {showJudgmentCta && (
              <div className="act2-library__afterword act2-library__afterword--judgment">
                {hasJudgment ? <p className="act2-tales__recorded" aria-live="polite">暂定判断已记入调查笔记；旧录尚不能说明来源或机制。</p> : null}
                {!hasJudgment ? (
                  <button
                    type="button"
                    className="act2-library__story-cta"
                    data-action-id="A2_T04_OPEN_JUDGMENT"
                    onClick={openJudgmentDrawer}
                  >
                    做出判断
                  </button>
                ) : null}
              </div>
            )}

            {excerptOpen && (
              <>
                <button type="button" className="act2-library__excerpt-dim" aria-label="关闭摘录抽屉" onClick={closeExcerptDrawer} />
                <div
                  ref={drawerRef}
                  className="act2-library__excerpt-drawer"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="act2-library-excerpt-title"
                >
                  <button ref={drawerCloseRef} type="button" className="act2-library__excerpt-close" onClick={closeExcerptDrawer}>关闭</button>
                  <div className="act2-library__drawer-tabs" role="tablist" aria-label="摘录与关键词">
                    <button
                      type="button"
                      className="act2-library__drawer-tab"
                      role="tab"
                      aria-selected={drawerPanel === 'excerpt'}
                      onClick={() => setDrawerPanel('excerpt')}
                    >
                      摘录
                    </button>
                    <button
                      type="button"
                      className="act2-library__drawer-tab"
                      role="tab"
                      aria-selected={drawerPanel === 'keywords'}
                      onClick={() => setDrawerPanel('keywords')}
                    >
                      可选标记关键词
                    </button>
                  </div>

                  {drawerPanel === 'excerpt' ? (
                    <div className="act2-library__drawer-panel" role="tabpanel">
                      <h2 id="act2-library-excerpt-title">{libraryExcerpt.title}</h2>
                      {excerptParts.source ? <p className="act2-library__excerpt-source">{excerptParts.source}</p> : null}
                      <blockquote className="act2-library__excerpt-quote">
                        {excerptParts.sentences.map((sentence, index) => (
                          <p key={`excerpt-s${index + 1}`}>{sentence}</p>
                        ))}
                      </blockquote>
                      {ruleKnown ? (
                        <div className="act2-library__conclusion">
                          <h3>{libraryCompletion.title}</h3>
                          <p className="act2-library__conclusion-line">{libraryCompletion.conclusion}</p>
                          <p className="act2-library__conclusion-detail">{libraryCompletion.detail}</p>
                        </div>
                      ) : null}
                      <p className="act2-library__excerpt-status">
                        {excerpted ? '已记入调查笔记' : '本页已登记，可把这段收入笔记'}
                      </p>
                      <button
                        type="button"
                        className="act2-library__excerpt-button"
                        aria-pressed={excerpted}
                        disabled={excerpted}
                        onClick={saveExcerpt}
                      >
                        {excerpted ? '已记入调查笔记' : '摘录到调查笔记'}
                      </button>
                      {ruleKnown ? (
                        <button
                          type="button"
                          className="act2-library__story-cta"
                          data-action-id="A2_T03_TO_TALES"
                          data-action-state="ready"
                          onClick={goToTales}
                        >
                          继续对照三篇志异
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="act2-library__drawer-panel act2-library__keywords" role="tabpanel">
                      <ul className="act2-library__keyword-list">
                        {keywords.map((keyword) => {
                          const marked = markedKeywordIds.includes(keyword.id);
                          return (
                            <li key={keyword.id}>
                              <button
                                type="button"
                                className={`act2-library__keyword${keyword.core ? ' act2-library__keyword--core' : ''}`}
                                data-keyword-id={keyword.id}
                                aria-pressed={marked}
                                onClick={() => manager.markGazetteKeyword(keyword.id)}
                              >
                                <span className="act2-library__keyword-label">{keyword.label}</span>
                                <span className="act2-library__keyword-gloss">{keyword.gloss}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}

            {judgmentOpen && (
              <>
                <button type="button" className="act2-library__excerpt-dim" aria-label="关闭判断抽屉" onClick={closeJudgmentDrawer} />
                <div
                  ref={drawerRef}
                  className="act2-library__excerpt-drawer act2-library__judgment-drawer"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="act2-library-judgment-title"
                >
                  <button ref={drawerCloseRef} type="button" className="act2-library__excerpt-close" onClick={closeJudgmentDrawer}>关闭</button>
                  <div className="act2-library__drawer-panel">
                    <div className="act2-library__judgment-scroll">
                      <h2 id="act2-library-judgment-title">做出判断</h2>
                      <details className="act2-tales__comparison" aria-labelledby="tale-comparison-title" open>
                        <summary id="tale-comparison-title">跨篇对照 · {tales.filter((tale) => talesProgress.readTaleIds.includes(tale.id)).length}/3 篇已读</summary>
                        <p>这里只列出已经读过的来源；第三篇可作补充核验。</p>
                        <div className="act2-library__person-cards">
                          {tales.filter((tale) => talesProgress.readTaleIds.includes(tale.id)).map((tale) => (
                            <article className="act2-library__person-card" key={tale.id}>
                              <div className="act2-library__person-head">
                                <h3 className="act2-library__person-name">{tale.comparison.person}</h3>
                                <button type="button" className="act2-library__text-link" onClick={() => openMaterial(tale.id)}>回看原文</button>
                              </div>
                              <dl>
                                <div><dt>原先缺少</dt><dd>{tale.comparison.missing}</dd></div>
                                <div><dt>获得或恢复</dt><dd>{tale.comparison.gain}</dd></div>
                                <div><dt>同时出现的变化</dt><dd>{tale.comparison.accompaniedChange}</dd></div>
                              </dl>
                            </article>
                          ))}
                        </div>
                      </details>
                      <details className="act2-tales__evidence-list" open>
                        <summary>已选支持片段 · {selectedSourceCount}/2 篇来源</summary>
                        {talesProgress.supportingEvidenceIds.length === 0 ? <p>读过旧录后，可在原文下方选取片段。</p> : <ul>{talesProgress.supportingEvidenceIds.map((id) => {
                          const evidence = taleEvidenceById.get(id);
                          const source = evidence ? taleById.get(evidence.taleId) : null;
                          return evidence && source ? <li key={id}><strong>{source.title} · {evidence.label}</strong><p>{evidence.excerpt}</p><button type="button" onClick={() => openMaterial(source.id)}>回看原文</button></li> : null;
                        })}</ul>}
                      </details>
                      {hasJudgment ? <p className="act2-tales__recorded" aria-live="polite">暂定判断已记入调查笔记；旧录尚不能说明来源或机制。</p> : null}
                    </div>
                    <div className="act2-library__judgment-pin">
                      <details className="act2-tales__hypotheses" aria-label="暂定判断选项" open>
                        <summary>比较支持片段后，选择暂定判断</summary>
                        <div className="act2-tales__hypothesis-options">
                          <button type="button" data-inference-id="accompanied-change" aria-pressed={talesProgress.selectedInferenceId === 'accompanied-change'} disabled={hasJudgment} onClick={() => chooseInference('accompanied-change')}>获得之外，同时出现原本不属于当事人的习惯或记忆</button>
                          <button type="button" data-inference-id="recovery-or-imitation" aria-pressed={talesProgress.selectedInferenceId === 'recovery-or-imitation'} disabled={hasJudgment} onClick={() => chooseInference('recovery-or-imitation')}>能力恢复后，当事人只是模仿了供物的习性</button>
                          <button type="button" data-inference-id="complete-transfer" aria-pressed={talesProgress.selectedInferenceId === 'complete-transfer'} disabled={hasJudgment} onClick={() => chooseInference('complete-transfer')}>供物原主的完整人格已经转移给当事人</button>
                        </div>
                      </details>
                      {inferenceStatus ? <p className="act2-library__excerpt-status" role="status">{inferenceStatus}</p> : null}
                      <button
                        type="button"
                        className="act2-library__story-cta"
                        data-action-id="A2_T04_CONFIRM_PATTERN"
                        data-action-state={hasJudgment ? 'completed' : inferenceReady ? 'ready' : 'blocked'}
                        disabled={hasJudgment || !inferenceReady}
                        onClick={confirmInference}
                      >
                        {hasJudgment ? '暂定结论已记下' : '确认暂定判断'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {supportOpen && endmatterTaleRecord && (
              <>
                <button type="button" className="act2-library__excerpt-dim" aria-label="关闭说明与片段" onClick={() => setSupportOpen(false)} />
                <div
                  ref={drawerRef}
                  className="act2-library__excerpt-drawer act2-library__support-drawer"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="act2-library-support-title"
                >
                  <button ref={drawerCloseRef} type="button" className="act2-library__excerpt-close" onClick={() => setSupportOpen(false)}>关闭</button>
                  <div className="act2-library__drawer-panel">
                    <h2 id="act2-library-support-title">{endmatterTaleRecord.title}</h2>
                    {endmatterTaleRecord.modernExplanation ? (
                      <details className="act2-tales__explanation" open>
                        <summary>现代文说明（辅助阅读）</summary>
                        <p>{endmatterTaleRecord.modernExplanation}</p>
                      </details>
                    ) : null}
                    {endmatterTaleRecord.evidence?.map((evidence) => (
                      <section className="act2-tales__evidence" key={evidence.id} data-evidence-id={evidence.id}>
                        <h4>{evidence.label} · 可支持的原文片段</h4>
                        <blockquote>{evidence.excerpt}</blockquote>
                        <button type="button" aria-pressed={talesProgress.supportingEvidenceIds.includes(evidence.id)} onClick={() => manager.toggleAct2TaleEvidence(evidence.id)}>
                          {talesProgress.supportingEvidenceIds.includes(evidence.id) ? '移出支持片段' : '选作支持片段'}
                        </button>
                      </section>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {measureBench}
    </section>
    </InvestigationShell>
  );
}

export default LibraryResearch;
