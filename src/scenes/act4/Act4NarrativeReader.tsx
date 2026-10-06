import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { stateManager, type StateManager } from '../../core/stateManager';
import { act4NarrativeSections, act4NarrativeExplanations, act4NarrativeEnding, type Act4NarrativeBlock } from '../../data/narrative/act4Narrative';
import { act4OldMails } from '../../data/act4/mail';
import { assetLoader } from '../../core/assetLoader';
import { act4NarrativeActionsSatisfied, type ActiveAct4NarrativeStage } from '../../story/act4/narrativePolicy';
import { InvestigationShell } from '../../components/investigation/InvestigationShell';
import type { InvestigationAction } from '../../components/investigation/types';
import {
  act4CompatibleReaderPageIndex,
  act4DateTimeValue,
  act4PagePresentation,
  act4ParagraphKind,
  act4PresentationKind,
  act4PrivateBlogPosts,
  act4ReaderTextPages,
  type Act4TextSegment,
} from '../../data/narrative/act4Presentation';
import { act4ReadingSpaceKey, sanitizeAct4ReadingPosition } from '../../core/readingPosition';
import { getUiPreferences, setAct4ReadingPosition, subscribeUiPreferences } from '../../core/uiPreferences';
import { Act4PrivateBlog } from './Act4PrivateBlog';
import '../../act4/act4.css';

const blockedReason: Partial<Record<ActiveAct4NarrativeStage, string>> = {
  T02: '先分别核对两封邮件的日期，再用这一天登录。',
  T04: '读完情境后打开 VVaKe 邮件，再继续阅读。',
  T08: '到达档案馆后，打开 2008 年的档案。',
  T09: '先把笔记藏好，再走到门外听完广播。',
  T10: '读完当下的故事后打开最后一封邮件。',
};

const readerPagesForBlock = (stage: ActiveAct4NarrativeStage, block: Act4NarrativeBlock) =>
  act4ReaderTextPages(stage, block.id, block.paragraphs, block.kind === 'novel-excerpt');

const READER_LAYOUT_VERSION_KEY = 'anchao.a4-reader-layout';
const READER_LAYOUT_VERSION = '2';
const PRIVATE_BLOG_BOOKMARKS_KEY = 'anchao.a4-private-blog-bookmarks';
let readerLayoutMigratedInMemory = false;
let activeReaderViewTransitions = 0;

function readPrivateBlogBookmarks(): string[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(PRIVATE_BLOG_BOOKMARKS_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string' && /^2020-04-\d{2}$/.test(item)) : [];
  } catch {
    return [];
  }
}

function isLegacyReaderLayout(): boolean {
  if (readerLayoutMigratedInMemory) return false;
  try {
    return window.localStorage.getItem(READER_LAYOUT_VERSION_KEY) !== READER_LAYOUT_VERSION;
  } catch {
    return true;
  }
}

function migrateReaderLayoutPreferences(): void {
  if (!isLegacyReaderLayout()) return;
  const preferences = getUiPreferences();
  for (const narrativeSection of act4NarrativeSections) {
    for (const mode of ['current', 'review'] as const) {
      const spaceKey = act4ReadingSpaceKey(narrativeSection.stage, mode)!;
      const position = preferences.act4Reading[spaceKey];
      if (!position) continue;
      const nextPageIndexByBlock = { ...position.pageIndexByBlock };
      for (const block of narrativeSection.blocks) {
        const requested = position.pageIndexByBlock[block.id];
        if (requested === undefined) continue;
        const pages = readerPagesForBlock(narrativeSection.stage, block)
          .filter((page) => page.role === 'page' || page.role === 'whole');
        nextPageIndexByBlock[block.id] = act4CompatibleReaderPageIndex(
          narrativeSection.stage,
          block.id,
          block.paragraphs,
          pages,
          requested,
          block.kind === 'novel-excerpt',
        );
      }
      setAct4ReadingPosition(spaceKey, { ...position, pageIndexByBlock: nextPageIndexByBlock });
    }
  }
  try {
    window.localStorage.setItem(READER_LAYOUT_VERSION_KEY, READER_LAYOUT_VERSION);
  } catch {
    // The in-memory migration still keeps this reader session on the safe paragraph boundary.
  }
  readerLayoutMigratedInMemory = true;
}

function transitionAct4View(update: () => void): void {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const transitionDocument = document as Document & {
    startViewTransition?: (callback: () => void) => { ready?: Promise<unknown>; finished?: Promise<unknown> };
  };
  if (reducedMotion || document.documentElement.dataset.sceneTransition === 'active') {
    update();
    return;
  }
  if (activeReaderViewTransitions > 0) {
    update();
    return;
  }
  if (window.location.protocol === 'file:' || typeof transitionDocument.startViewTransition !== 'function') {
    update();
    animateAct4Arrival();
    return;
  }
  let committed = false;
  let fallbackApplied = false;
  const commitOnce = () => {
    if (committed) return;
    committed = true;
    flushSync(update);
  };
  const applyFallback = () => {
    if (!committed) commitOnce();
    if (fallbackApplied) return;
    fallbackApplied = true;
    if (!reducedMotion) animateAct4Arrival();
  };
  let scopeClosed = false;
  activeReaderViewTransitions += 1;
  document.documentElement.dataset.a4ReaderTransition = 'active';
  const closeTransitionScope = () => {
    if (scopeClosed) return;
    scopeClosed = true;
    activeReaderViewTransitions = Math.max(0, activeReaderViewTransitions - 1);
    if (activeReaderViewTransitions === 0) delete document.documentElement.dataset.a4ReaderTransition;
  };
  try {
    const transition = transitionDocument.startViewTransition.call(transitionDocument, commitOnce);
    void transition.ready?.catch(() => {
      closeTransitionScope();
      applyFallback();
    });
    if (transition.finished) void transition.finished.then(closeTransitionScope, closeTransitionScope);
    else if (transition.ready) void transition.ready.then(() => window.setTimeout(closeTransitionScope, 260), closeTransitionScope);
    else window.setTimeout(closeTransitionScope, 260);
  } catch {
    closeTransitionScope();
    applyFallback();
  }
}

function animateAct4Arrival(): void {
  const reader = document.querySelector<HTMLElement>('.a4-reader');
  if (!reader) return;
  window.requestAnimationFrame(() => {
    reader.classList.remove('a4-reader--transition-arrival');
    void reader.offsetWidth;
    reader.classList.add('a4-reader--transition-arrival');
    window.setTimeout(() => reader.classList.remove('a4-reader--transition-arrival'), 260);
  });
}

const perspectiveLabel = (perspective: 'investigator' | 'wangao') => perspective === 'wangao'
  ? '王澳当时的亲历'
  : '主角与小月的调查';

export function Act4NarrativeReader({ manager = stateManager, onExit }: { manager?: StateManager; onExit: () => void }) {
  const whole = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const state = whole.modules.act4;
  const currentStage = state.stage;
  const [reviewStage, setReviewStage] = useState<ActiveAct4NarrativeStage | null>(null);
  const [password, setPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [passwordHintLevel, setPasswordHintLevel] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomedIllustration, setZoomedIllustration] = useState<{ assetId: string; alt: string } | null>(null);
  const [failedIllustrationAssetId, setFailedIllustrationAssetId] = useState<string | undefined>();
  const [hotelBackgroundExpanded, setHotelBackgroundExpanded] = useState(true);
  const [endingRecapExpanded, setEndingRecapExpanded] = useState(false);
  const [privateBlogOpen, setPrivateBlogOpen] = useState(false);
  const [bookmarkedBlogDates, setBookmarkedBlogDates] = useState<string[]>(readPrivateBlogBookmarks);
  const uiPreferences = useSyncExternalStore(subscribeUiPreferences, getUiPreferences, getUiPreferences);
  const readerRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const zoomButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const reviewTriggerRef = useRef<string | null>(null);
  const savedCurrentPositionRef = useRef<{ scrollTop: number } | null>(null);
  const returningToCurrentRef = useRef(false);
  const skipPageAutoScrollRef = useRef(false);
  const continueClickLockRef = useRef(false);
  const layoutMigrationStartedRef = useRef(false);
  const actions = state.completedNarrativeActionIds;
  const hasAction = (actionId: string | undefined) => actionId !== undefined && actions.includes(actionId as typeof actions[number]);

  const section = act4NarrativeSections.find((item) => item.stage === (reviewStage ?? currentStage));
  const reviewing = section !== undefined && section.stage !== currentStage;
  const stage = section?.stage ?? 'T01';
  const privateBlogView = stage === 'T03' && privateBlogOpen;
  const readingSpaceKey = act4ReadingSpaceKey(stage, reviewing ? 'review' : 'current') ?? `${stage}:current`;
  const storedReadingPosition = uiPreferences.act4Reading[readingSpaceKey];
  const storedPageIndex = (block: Act4NarrativeBlock, pages: readonly Act4TextSegment[]) => {
    const requested = storedReadingPosition?.pageIndexByBlock[block.id] ?? 0;
    if (isLegacyReaderLayout()) {
      return act4CompatibleReaderPageIndex(stage, block.id, block.paragraphs, pages, requested, block.kind === 'novel-excerpt');
    }
    return Math.max(0, Math.min(Math.max(0, pages.length - 1), Number.isInteger(requested) ? requested : 0));
  };

  useLayoutEffect(() => {
    if (layoutMigrationStartedRef.current) return;
    layoutMigrationStartedRef.current = true;
    migrateReaderLayoutPreferences();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PRIVATE_BLOG_BOOKMARKS_KEY, JSON.stringify(bookmarkedBlogDates));
    } catch {
      // Bookmarks remain available for the current reader session when storage is unavailable.
    }
  }, [bookmarkedBlogDates]);

  const focusPrivateBlog = () => {
    const stream = readerRef.current?.querySelector<HTMLElement>('.a4-private-blog__feed');
    const scene = readerRef.current?.closest<HTMLElement>('.investigation-shell__scene');
    if (!stream || !scene) return;
    stream.focus({ preventScroll: true });
    scene.scrollTop += stream.getBoundingClientRect().top - scene.getBoundingClientRect().top - 18;
  };

  const togglePrivateBlog = (open: boolean) => transitionAct4View(() => setPrivateBlogOpen(open));

  function openReview(targetStage: ActiveAct4NarrativeStage, triggerKey: string): void {
    if (targetStage === currentStage) {
      if (reviewStage !== null) returnToCurrent();
      return;
    }
    if (reviewStage === null) {
      const scene = readerRef.current?.closest<HTMLElement>('.investigation-shell__scene');
      savedCurrentPositionRef.current = { scrollTop: scene?.scrollTop ?? 0 };
      reviewTriggerRef.current = triggerKey;
    }
    transitionAct4View(() => setReviewStage(targetStage));
  }

  function returnToCurrent(): void {
    returningToCurrentRef.current = true;
    skipPageAutoScrollRef.current = true;
    transitionAct4View(() => setReviewStage(null));
  }

  function continueCurrentSection(expectedStage: ActiveAct4NarrativeStage): void {
    if (continueClickLockRef.current) return;
    continueClickLockRef.current = true;
    window.setTimeout(() => { continueClickLockRef.current = false; }, 500);
    if (expectedStage === 'T10') manager.advanceAct4NarrativeSection(expectedStage);
    else transitionAct4View(() => manager.advanceAct4NarrativeSection(expectedStage));
  }

  useLayoutEffect(() => {
    const scene = readerRef.current?.closest<HTMLElement>('.investigation-shell__scene');
    if (!scene) return;
    if (reviewing) {
      scene.scrollTop = 0;
      readerRef.current?.focus({ preventScroll: true });
      return;
    }
    if (returningToCurrentRef.current && savedCurrentPositionRef.current) {
      scene.scrollTop = savedCurrentPositionRef.current.scrollTop;
      returningToCurrentRef.current = false;
      savedCurrentPositionRef.current = null;
      const triggerKey = reviewTriggerRef.current;
      const trigger = triggerKey
        ? [...(readerRef.current?.querySelectorAll<HTMLElement>('[data-review-trigger]') ?? [])].find((item) => item.dataset.reviewTrigger === triggerKey)
        : undefined;
      reviewTriggerRef.current = null;
      (trigger ?? readerRef.current)?.focus({ preventScroll: true });
    } else {
      scene.scrollTop = 0;
      readerRef.current?.focus({ preventScroll: true });
    }
  }, [section?.stage, reviewing]);

  useLayoutEffect(() => {
    if (skipPageAutoScrollRef.current) {
      skipPageAutoScrollRef.current = false;
      return;
    }
    const page = readerRef.current?.querySelector<HTMLElement>('.a4-reader__segment[data-reader-active="true"], .a4-reader__cover[data-reader-active="true"]');
    const scene = readerRef.current?.closest<HTMLElement>('.investigation-shell__scene');
    if (!page || !scene) return;
    page.focus({ preventScroll: true });
    const pageRect = page.getBoundingClientRect();
    const sceneRect = scene.getBoundingClientRect();
    scene.scrollTop += pageRect.top - sceneRect.top - 18;
  }, [uiPreferences, reviewStage, state.stage]);

  useLayoutEffect(() => {
    if (stage !== 'T03') return;
    const target = readerRef.current?.querySelector<HTMLElement>(privateBlogOpen ? '.a4-private-blog' : '.a4-private-blog-gateway');
    target?.focus({ preventScroll: true });
    const scene = readerRef.current?.closest<HTMLElement>('.investigation-shell__scene');
    if (target && scene) scene.scrollTop += target.getBoundingClientRect().top - scene.getBoundingClientRect().top - 18;
  }, [privateBlogOpen, stage]);

  useEffect(() => {
    if (!zoomOpen) return;
    const shell = readerRef.current?.closest<HTMLElement>('.investigation-shell');
    returnFocusRef.current = zoomButtonRef.current;
    shell?.setAttribute('inert', '');
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      shell?.removeAttribute('inert');
      window.requestAnimationFrame(() => returnFocusRef.current?.focus());
    };
  }, [zoomOpen]);
  useEffect(() => {
    if (state.stage === 'T10' && state.completedNarrativeSectionIds.includes('A4_READ_T10') && whole.game.flags.FLAG_A4_COMPLETE === true) setEndingRecapExpanded(true);
  }, [state.completedNarrativeSectionIds, state.stage, whole.game.flags.FLAG_A4_COMPLETE]);
  if (!section) return null;
  const presentationKind = act4PresentationKind(stage);
  const isWangaoMemory = ['T05', 'T06', 'T07', 'T08', 'T09'].includes(stage);
  const primaryBlock = section.blocks.find((block) => block.id === `${stage}_ORIGINAL`)
    ?? section.blocks.find((block) => block.kind === 'novel-excerpt');
  const primaryPages = primaryBlock
    ? readerPagesForBlock(stage, primaryBlock).filter((item) => item.role === 'page' || item.role === 'whole')
    : [];
  const primaryPageIndex = primaryBlock && primaryPages.length
    ? storedPageIndex(primaryBlock, primaryPages)
    : 0;
  const primaryPage = primaryPages[primaryPageIndex];
  const pagePresentation = act4PagePresentation(stage, primaryPageIndex, primaryBlock?.id, primaryPage?.label, primaryPage?.sceneIndex);
  const displayTitle = pagePresentation?.title ?? section.title;
  const displayPeriodLabel = pagePresentation?.periodLabel ?? section.periodLabel;
  const t05RecapSentenceLimit = stage === 'T05' && primaryPage
    ? primaryPage.from < 8 ? 0 : primaryPage.from < 13 ? 1 : primaryPage.to >= 23 ? 3 : 2
    : stage === 'T05' ? 0 : undefined;
  const actionCompleted = act4NarrativeActionsSatisfied(stage, actions);
  const sectionCompleted = state.completedNarrativeSectionIds.includes(section.id);
  const finalCompleted = stage === 'T10' && sectionCompleted && whole.game.flags.FLAG_A4_COMPLETE === true;
  const visibleBlocks = section.blocks.filter((block) => !block.revealAfterActionId || hasAction(block.revealAfterActionId));
  const needsCover = (kind: string) => (stage === 'T01' || isWangaoMemory || stage === 'T10') && kind === 'novel-excerpt';
  const readingBounds = visibleBlocks.flatMap((block) => {
    const pages = readerPagesForBlock(stage, block).filter((item) => item.role === 'page' || item.role === 'whole');
    if (!pages.length) return [];
    const coverKeys = needsCover(block.kind) ? pages.map((page) => {
      const currentKey = `${stage}:${reviewing ? 'review' : 'current'}:${block.id}`;
      return stage === 'T01' || stage === 'T10'
        ? `${currentKey}:cover`
        : `${currentKey}:${page.sceneId ?? block.id}:cover`;
    }) : [];
    return [{ blockId: block.id, pageCount: pages.length, coverKeys }];
  });
  const readingPosition = sanitizeAct4ReadingPosition(storedReadingPosition, readingBounds);
  const pageIndexByBlock = readingPosition.pageIndexByBlock;
  const openedCoverKeys = new Set(readingPosition.openedCoverKeys);
  const persistReadingPosition = (patch: Partial<typeof readingPosition>) => {
    setAct4ReadingPosition(readingSpaceKey, sanitizeAct4ReadingPosition({ ...readingPosition, ...patch }, readingBounds));
  };
  const markNotebookPageRead = (blockId: string, pageIndex: number) => {
    if (stage === 'T01' && !reviewing && blockId === 'T01_ORIGINAL') manager.readAct4NotebookPage(pageIndex + 1);
  };
  const pageTargets = visibleBlocks.flatMap((block) => {
    if (block.kind === 'adaptation-bridge') return [];
    const pages = readerPagesForBlock(stage, block).filter((item) => item.role === 'page' || item.role === 'whole');
    if (!pages.length) return [];
    const pageIndex = storedPageIndex(block, pages);
    const page = pages[pageIndex];
    const currentKey = `${stage}:${reviewing ? 'review' : 'current'}:${block.id}`;
    const coverKey = stage === 'T01' || stage === 'T10'
      ? `${currentKey}:cover`
      : `${currentKey}:${page.sceneId ?? block.id}:cover`;
    return [{ blockId: block.id, blockKind: block.kind, pages, pageIndex, page, coverKey, coverRequired: needsCover(block.kind), coverOpen: openedCoverKeys.has(coverKey) }];
  });
  const readingTargetTitle = (target: (typeof pageTargets)[number]) =>
    stage === 'T10' && target.blockId === 'T10_FINAL_MAIL'
      ? '最后一封邮件'
      : target.page.sceneLabel || target.page.label || '这一段';
  const rememberedBlockId = readingPosition.activeBlockId;
  const activeReadingTarget = pageTargets.find((target) => target.blockId === rememberedBlockId) ?? pageTargets.find((target) => target.blockId === `${stage}_ORIGINAL`) ?? pageTargets[0];
  const activeReadingBlockIndex = activeReadingTarget ? visibleBlocks.findIndex((block) => block.id === activeReadingTarget.blockId) : -1;
  const nextReadingTarget = activeReadingTarget ? pageTargets.find((target) => visibleBlocks.findIndex((block) => block.id === target.blockId) === activeReadingBlockIndex + 1) : undefined;
  const t01PageControls = stage === 'T01' && activeReadingTarget?.coverOpen === true && activeReadingTarget.blockId === 'T01_ORIGINAL';
  const continueAction: InvestigationAction = stage === 'T03' && reviewing
    ? {
      actionId: 'A4_RETURN_TO_CURRENT_PROGRESS', kind: 'return', label: '返回当前阅读进度', state: 'ready',
      onActivate: returnToCurrent,
    }
    : stage === 'T03'
      ? {
        actionId: 'A4_T03_VIEW_PRIVATE_BLOG', kind: 'memory', target: 'T03_ORIGINAL', label: '查看动态', state: 'ready',
        onActivate: () => {
          if (privateBlogOpen) focusPrivateBlog();
          else togglePrivateBlog(true);
        },
      }
    : activeReadingTarget && activeReadingTarget.coverRequired && !activeReadingTarget.coverOpen
      ? {
        actionId: `A4_${stage}_OPEN_COVER_${activeReadingTarget.blockId}_${activeReadingTarget.pageIndex + 1}`, kind: 'memory', target: activeReadingTarget.blockId,
        label: stage === 'T01' ? '翻开小 A 的笔记' : `翻开：${readingTargetTitle(activeReadingTarget)}`, state: 'ready',
        onActivate: () => {
          if (stage === 'T01') setHotelBackgroundExpanded(false);
          markNotebookPageRead(activeReadingTarget.blockId, activeReadingTarget.pageIndex);
          transitionAct4View(() => persistReadingPosition({
            activeBlockId: activeReadingTarget.blockId,
            openedCoverKeys: [...new Set([...readingPosition.openedCoverKeys, activeReadingTarget.coverKey])],
          }));
        },
      }
      : activeReadingTarget && activeReadingTarget.pageIndex < activeReadingTarget.pages.length - 1
        ? {
          actionId: `A4_${stage}_NEXT_PAGE_${activeReadingTarget.blockId}_${activeReadingTarget.pageIndex + 1}`, kind: 'memory', target: activeReadingTarget.blockId,
          label: stage === 'T01' ? `继续阅读 · ${activeReadingTarget.pageIndex + 1} / ${activeReadingTarget.pages.length}` : activeReadingTarget.pages[activeReadingTarget.pageIndex + 1]?.sceneId !== activeReadingTarget.page.sceneId
            ? '继续阅读'
            : `下一页 · ${activeReadingTarget.pageIndex + 1} / ${activeReadingTarget.pages.length}`, state: 'ready',
          onActivate: () => {
            const nextPageIndex = activeReadingTarget.pageIndex + 1;
            markNotebookPageRead(activeReadingTarget.blockId, nextPageIndex);
            const update = () => persistReadingPosition({
              activeBlockId: activeReadingTarget.blockId,
              pageIndexByBlock: { ...pageIndexByBlock, [activeReadingTarget.blockId]: nextPageIndex },
            });
            if (activeReadingTarget.pages[nextPageIndex]?.sceneId !== activeReadingTarget.page.sceneId) transitionAct4View(update);
            else update();
          },
        }
    : activeReadingTarget && nextReadingTarget
      ? {
        actionId: `A4_${stage}_NEXT_BLOCK_${nextReadingTarget.blockId}`, kind: 'memory', target: nextReadingTarget.blockId,
        label: '继续阅读', state: 'ready',
        onActivate: () => transitionAct4View(() => persistReadingPosition({ activeBlockId: nextReadingTarget.blockId })),
      }
    : reviewing
      ? {
        actionId: 'A4_RETURN_TO_CURRENT_PROGRESS', kind: 'return', label: '返回当前阅读进度', state: 'ready',
        onActivate: returnToCurrent,
      }
      : {
      actionId: `A4_${stage}_CONTINUE_READING`,
      kind: stage === 'T10' ? 'story' : 'memory',
      target: stage === 'T10' ? 'A4_COMPLETE' : `A4_READ_T${String(Number(stage.slice(1)) + 1).padStart(2, '0')}`,
      label: finalCompleted ? '第四幕已完成' : stage === 'T10' ? '完成第四幕' : '读完这一段，继续',
      state: finalCompleted ? 'completed' : actionCompleted ? 'ready' : 'blocked',
      reason: actionCompleted ? undefined : blockedReason[stage] ?? '先读完这一段，再继续。',
      onActivate: () => continueCurrentSection(stage),
    };

  const displayedEnds = new Map(pageTargets.map((target) => {
    const coverAllowsText = !target.coverRequired || target.coverOpen;
    const atEnd = target.pageIndex === target.pages.length - 1;
    return [target.blockId, !coverAllowsText ? 0 : atEnd ? visibleBlocks.find((block) => block.id === target.blockId)?.paragraphs.length ?? 0 : target.page.to] as const;
  }));
  const hasDisplayedBlock = (block: Act4NarrativeBlock) => (displayedEnds.get(block.id) ?? 0) >= block.paragraphs.length;
  const allVisibleTextDisplayed = visibleBlocks.filter((block) => block.kind !== 'adaptation-bridge').every(hasDisplayedBlock);
  const t05PartialRecapAvailable = stage === 'T05' && Boolean(primaryPage && primaryPage.from >= 8)
    && activeReadingTarget?.blockId === primaryBlock?.id && activeReadingTarget.coverOpen;
  const visibleExplanationIds = new Set<string>();
  for (const block of visibleBlocks) {
    if (!block.explanationId) continue;
    if (block.explanationId === section.explanationId && !allVisibleTextDisplayed && !t05PartialRecapAvailable) continue;
    if (block.explanationId !== section.explanationId && !hasDisplayedBlock(block)) continue;
    visibleExplanationIds.add(block.explanationId);
  }
  if ((allVisibleTextDisplayed || t05PartialRecapAvailable) && (!section.explanationRevealAfterActionId || hasAction(section.explanationRevealAfterActionId)) && section.explanationId) {
    visibleExplanationIds.add(section.explanationId);
  }
  const completedSectionIds = state.completedNarrativeSectionIds;
  const availableSections = act4NarrativeSections.filter((item) => completedSectionIds.includes(item.id) || item.stage === currentStage);
  const textBySection = new Map(act4NarrativeSections.map((item) => [item.id, item.id === section.id ? displayTitle : item.title]));

  const renderInteractionAfter = (blockId: string): ReactNode => {
    if (reviewing) return null;
    if (stage === 'T02' && blockId === 'T02_ORIGINAL') {
      const bothMailboxesChecked = ['protagonist', 'xiaoyue'].every((recipient) => state.checkedMailRecipients.includes(recipient));
      const loginSucceeded = hasAction('A4_T02_LOGIN_SUCCEEDED');
      const hints = [
        '先对照两封旧邮件的发送时间。',
        '两封邮件指向同一天；“那一天”就是邮件上的日期。',
        '可以尝试输入：20200419。',
      ];
      return <section className="a4-reader__interaction" aria-label="核对旧邮件并登录" key="T02_LOGIN_INTERACTION">
        <h3>{loginSucceeded ? '两个账号已登录' : '登录两个账号'}</h3>
        {loginSucceeded
          ? <p role="status">登录成功。微博和邮箱记录现已展开；读完这段后继续进入王澳的微博。</p>
          : <>
            <p>分别核对邮件日期后，输入八位数字登录。提示按需逐级查看。</p>
            <button type="button" disabled={passwordHintLevel >= hints.length} onClick={() => setPasswordHintLevel((level) => Math.min(hints.length, level + 1))}>
              {passwordHintLevel >= hints.length ? '已显示最后一级提示' : `查看下一级提示（${passwordHintLevel}/${hints.length}）`}
            </button>
            {passwordHintLevel > 0 && <p role="status" data-password-hint-level={passwordHintLevel}>{hints[passwordHintLevel - 1]}</p>}
          </>}
        <div className="a4-reader__mail-list">
          {act4OldMails.map((mail) => <article className="a4-reader__mail" key={mail.id}>
            <h4>{mail.label}收到</h4>
            <p><strong>发件人：</strong>{mail.from}</p>
            <p><strong>主题：</strong>{mail.subject}</p>
            <p><strong>时间：</strong><time>{mail.sentAt.slice(0, 10)} {mail.sentAt.slice(11, 16)}</time></p>
            <button type="button" disabled={state.checkedMailRecipients.includes(mail.id)} onClick={() => manager.checkAct4OldMail(mail.id)}>
              {state.checkedMailRecipients.includes(mail.id) ? '已核对日期' : '核对这封邮件'}
            </button>
          </article>)}
        </div>
        {!loginSucceeded && <>
          <label className="a4-reader__password-label" htmlFor="a4-shared-date">输入两封邮件共同的日期</label>
          <div className="a4-reader__login">
            <input id="a4-shared-date" inputMode="numeric" autoComplete="off" maxLength={8} disabled={!bothMailboxesChecked} value={password} onChange={(event) => setPassword(event.target.value)} />
            <button type="button" disabled={!bothMailboxesChecked} onClick={() => {
              const ok = manager.loginAct4Accounts(password);
              setLoginMessage(ok ? '登录成功。现在可以继续阅读账号里的记录。' : '日期不匹配；请核对两封邮件上的年月日，再输入八位数字。');
            }}>登录账号</button>
          </div>
          <p role="status" aria-live="polite">{loginMessage}</p>
        </>}
      </section>;
    }
    if (stage === 'T04' && blockId === 'T04_CONTEXT' && !hasAction('A4_T04_WAKE_MAIL_OPENED')) {
      return <section className="a4-reader__interaction" aria-label="打开 VVaKe 邮件" key="T04_WAKE_MAIL_INTERACTION">
        <p>打开这封旧邮件，查看邮件内容。</p>
        <button type="button" onClick={() => manager.viewAct4WakeMail()}>打开这封邮件</button>
      </section>;
    }
    if (stage === 'T08' && blockId === 'T08_RETURN' && !hasAction('A4_T08_ARCHIVE_OPENED')) {
      return <section className="a4-reader__interaction" aria-label="打开档案" key="T08_ARCHIVE_INTERACTION">
        <p>他停在档案架前。可以选一份档案继续查看。</p>
        <button type="button" onClick={() => manager.openAct4Archive()}>查看 2008 年档案</button>
      </section>;
    }
    if (stage === 'T09' && blockId === 'T09_REPLY_AND_LAST_PAGE' && !hasAction('A4_T09_NOTE_HIDDEN')) {
      return <section className="a4-reader__interaction" aria-label="藏好最后一页笔记" key="T09_HIDE_NOTE_INTERACTION">
        <p>接下来，按他当时的做法安放写好的本子。</p>
        <button type="button" onClick={() => manager.hideAct4NarrativeNote()}>把笔记藏到消防箱后</button>
      </section>;
    }
    if (stage === 'T09' && blockId === 'T09_WALK_TO_DOOR' && !hasAction('A4_T09_DOOR_EXITED')) {
      return <section className="a4-reader__interaction" aria-label="走向门外" key="T09_EXIT_DOOR_INTERACTION">
        <p>准备继续走向门外。</p>
        <button type="button" onClick={() => manager.exitAct4NarrativeDoor()}>走向门外，听完广播</button>
      </section>;
    }
    if (stage === 'T10' && blockId === 'T10_AFTERMATH' && !hasAction('A4_T10_FINAL_MAIL_OPENED')) {
      return <section className="a4-reader__interaction" aria-label="打开最后一封邮件" key="T10_FINAL_MAIL_INTERACTION">
        <p>几个月后，收件箱里出现一封关于王澳同学相关事项的邮件。</p>
        <button type="button" onClick={() => transitionAct4View(() => {
          manager.openAct4FinalMail();
          // The mail becomes visible only after the action, so the current bounds do not include it yet.
          setAct4ReadingPosition(readingSpaceKey, {
            ...readingPosition,
            activeBlockId: 'T10_FINAL_MAIL',
            pageIndexByBlock: { ...pageIndexByBlock, T10_FINAL_MAIL: 0 },
          });
        })}>打开启明的最后一封邮件</button>
      </section>;
    }
    return null;
  };

  const handleZoomKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setZoomOpen(false);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [])];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (first && last && event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (first && last && !event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const renderExplanationPanels = (ids: Iterable<string>) => [...ids].map((id) => {
    const explanation = act4NarrativeExplanations[id as keyof typeof act4NarrativeExplanations];
    if (!explanation) return null;
    const t05Recap = stage === 'T05' && id === 'A4_EXPLAIN_T05';
    if (t05Recap && !t05RecapSentenceLimit) return null;
    const explanationSentences = explanation.text.match(/[^；。]+[；。]?/gu) ?? [explanation.text];
    const visibleRecapClauses = t05RecapSentenceLimit ?? 0;
    const explanationText = t05Recap
      ? explanationSentences.slice(0, visibleRecapClauses).join('')
      : explanation.text;
    const explanationHeading = t05Recap && visibleRecapClauses < explanationSentences.length
      ? '当前阅读页回顾'
      : explanation.heading;
    return <details className="a4-reader__explanation" data-explanation-id={id} key={id}>
      <summary>{explanationHeading}</summary>
      <div className="a4-reader__explanation-content">
        <p>{explanationText}</p>
        {explanation.connections.map((connection) => <p className="a4-reader__connection" key={connection}>{connection}</p>)}
        {explanation.replaySectionIds.some((replayId) => completedSectionIds.includes(replayId)) && <nav className="a4-reader__previous" aria-label="回看前文">
          {explanation.replaySectionIds.filter((replayId) => completedSectionIds.includes(replayId)).map((replayId) => {
          const prior = act4NarrativeSections.find((item) => item.id === replayId);
          return prior && <button type="button" key={replayId} data-review-trigger={`replay-${stage}-${replayId}`} onClick={() => openReview(prior.stage, `replay-${stage}-${replayId}`)}>回看前文：{textBySection.get(replayId)}</button>;
          })}
        </nav>}
      </div>
    </details>;
  });

  const renderVisibleSegments = (blockId: string, paragraphs: string[], currentPage: Act4TextSegment | undefined, visibleSegments: Act4TextSegment[], pageIndex: number, pageCount: number, focusCurrentPage = true) => (
    <div className="a4-reader__segment-pages" data-active-segment-id={currentPage?.id} data-active-page={pageIndex + 1} data-page-count={pageCount}>
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
        const showSegmentHeading = Boolean(pageHeading) && (stage === 'T01' || Boolean(contentSegment.sceneId) || !['T03', 'T05'].includes(stage));
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
          <div className="a4-reader__paragraphs">{segmentParagraphs.map((paragraph, localIndex) => {
            const index = contentSegment.from + localIndex;
            if (firstParagraphIsDate && localIndex === 0) return null;
            const kind = act4ParagraphKind(stage, blockId, index, paragraph);
            const dateTime = kind === 'social-date' ? act4DateTimeValue(paragraph) : undefined;
            const paragraphClass = kind ? `a4-reader__paragraph a4-reader__paragraph--${kind}` : 'a4-reader__paragraph';
            return dateTime
              ? <time className={paragraphClass} dateTime={dateTime} key={`${blockId}-${index}`}>{paragraph}</time>
              : <p className={paragraphClass} key={`${blockId}-${index}`}>{paragraph}</p>;
          })}</div>
        </section>;
      })}
    </div>
  );

  const renderEndingRecap = () => <>
    {renderExplanationPanels(visibleExplanationIds)}
    <section className="a4-reader__ending" aria-label="第四幕完结回顾">
      <h3>第四幕阅读完成</h3>
      <p>这段故事留下了已知的经历，也留下没有答案的部分。</p>
      <h4>时间线</h4>
      <ol>
        {act4NarrativeEnding.timeline.map((item) => <li key={item.when}><strong>{item.when}：</strong>{item.text}</li>)}
      </ol>
      <h4>人物和线索</h4>
      {act4NarrativeEnding.people.map((person) => <p key={person.name}><strong>{person.name}：</strong>{person.text}</p>)}
    </section>
  </>;

  return <InvestigationShell
    ariaLabel="第四幕故事阅读"
    actLabel="第四幕 · 暗潮"
    locationLabel={displayTitle}
    className={`investigation-shell--reading${privateBlogView ? ' investigation-shell--reading-blog' : ''}`}
    objective={stage === 'T03'
      ? privateBlogOpen ? '浏览王澳按日期留下的私人动态；读到末尾后可以继续。' : '查看登录后的王澳私人动态。'
      : stage === 'T10' ? '读完结尾与最后一封邮件，保留仍未确定的去向。'
        : activeReadingTarget ? '继续读完当前内容；需要行动时，会在这里出现。' : '这一部分已经读完，可以继续。'}
    helpText={stage === 'T03' ? '可以按日期回看，也可以收藏想留意的一条。' : '先看这一段的场景，再读文字。已读内容可以回看；需要做的事仍由你决定。'}
    actions={privateBlogView || (t01PageControls && !reviewing && activeReadingTarget && activeReadingTarget.pageIndex < activeReadingTarget.pages.length - 1) ? [] : [continueAction]}
    onExit={onExit}
  >
    <main className={`a4-reader a4-reader--${presentationKind}${privateBlogView ? ' a4-reader--private-blog-open' : ''}`} style={{ '--a4-reader-font-size': `${uiPreferences.readerFontSize}px` } as CSSProperties} data-act4-stage={currentStage} data-reading-stage={stage} data-presentation-kind={presentationKind} ref={readerRef} tabIndex={-1}>
      <article className="a4-reader__story" aria-label={`${displayTitle}故事`}>
        <header className="a4-reader__heading">
          <h2 className="sr-only">{displayTitle}</h2>
          <p className="a4-reader__perspective" data-perspective={section.perspective}>
            {displayPeriodLabel}{isWangaoMemory && !displayPeriodLabel.includes('王澳') ? ' · 王澳' : ''} · {isWangaoMemory ? '王澳当时的回忆' : perspectiveLabel(section.perspective)}{reviewing ? ' · 回看' : ''}
          </p>
          {reviewing && <button type="button" className="a4-reader__return-current" onClick={returnToCurrent}>回到当前阅读</button>}
        </header>

        <details className="a4-reader__index">
          <summary>已读目录与前文（{completedSectionIds.length}/10）</summary>
          <nav aria-label="已读章节目录">
            {availableSections.map((item) => <button type="button" key={item.id} data-review-trigger={`index-${item.stage}`} aria-current={stage === item.stage ? 'page' : undefined} onClick={() => openReview(item.stage, `index-${item.stage}`)}>
              {item.stage === currentStage ? '当前：' : ''}{item.stage === stage ? displayTitle : item.title}
            </button>)}
          </nav>
        </details>

        <div className="a4-reader__blocks">
          {visibleBlocks.map((block, blockOrder) => {
            if (blockOrder > activeReadingBlockIndex) return null;
            const segments = readerPagesForBlock(stage, block);
            const pages = segments.filter((item) => item.role === 'page' || item.role === 'whole');
            const pageIndex = storedPageIndex(block, pages);
            if (stage === 'T03' && block.id === 'T03_ORIGINAL') {
              const blogPosts = act4PrivateBlogPosts(block.paragraphs);
              return <div className="a4-reader__block-stack" key={block.id}>
                <section
                  className="a4-reader__block a4-reader__block--novel-excerpt a4-reader__block--private-blog"
                  data-block-id={block.id}
                  data-source-ref-id={block.sourceRefId}
                  data-content-kind={block.kind}
                  data-presentation-kind={presentationKind}
                  data-paragraph-count={block.paragraphs.length}
                  data-reading-view={privateBlogOpen ? 'blog' : 'context'}
                >
                  {privateBlogOpen
                    ? <Act4PrivateBlog
                      openingText={block.paragraphs[0]}
                      posts={blogPosts}
                      closingText={block.paragraphs.at(-1) ?? ''}
                      bookmarkedDates={bookmarkedBlogDates}
                      onToggleBookmark={(dateTime) => setBookmarkedBlogDates((current) => current.includes(dateTime)
                        ? current.filter((item) => item !== dateTime)
                        : [...current, dateTime])}
                      onReturnToContext={() => togglePrivateBlog(false)}
                      onContinue={() => reviewing ? returnToCurrent() : continueCurrentSection('T03')}
                      continueLabel={reviewing ? '返回当前阅读进度' : '读完动态，继续'}
                    />
                    : <div className="a4-private-blog-gateway" tabIndex={-1} aria-label="动态记录入口">
                      <p className="a4-private-blog-gateway__source">{block.paragraphs[0]}</p>
                      <div className="a4-private-blog-gateway__card">
                        <p>私人动态 · 账号记录</p>
                        <h3>王澳的动态</h3>
                        <p>2020 年 4 月 3 日至 19 日 · {blogPosts.length} 条按日期记录</p>
                      </div>
                    </div>}
                </section>
              </div>;
            }
            if (blockOrder < activeReadingBlockIndex) {
              const previousPage = pages[pages.length - 1];
              const previousSegments = [...pages, ...segments.filter((item) => item.role === 'ending')];
              return <details className="a4-reader__past-block" key={block.id}>
                <summary>{block.kind === 'adaptation-bridge' ? '关于王澳的回忆' : `回看已读内容：${previousPage?.sceneLabel || previousPage?.label || section.title}`}</summary>
                {renderVisibleSegments(block.id, block.paragraphs, previousPage, previousSegments, Math.max(0, pages.length - 1), pages.length, false)}
              </details>;
            }
            const currentPage = pages[pageIndex];
            const currentKey = `${stage}:${reviewing ? 'review' : 'current'}:${block.id}`;
            const coverKey = stage === 'T01' || stage === 'T10'
              ? `${currentKey}:cover`
              : `${currentKey}:${currentPage?.sceneId ?? block.id}:cover`;
            const coverRequired = needsCover(block.kind);
            const coverOpen = openedCoverKeys.has(coverKey);
            const showCover = coverRequired && !coverOpen;
            const blockPagePresentation = act4PagePresentation(stage, pageIndex, block.id, currentPage?.label, currentPage?.sceneIndex);
            const coverTitle = stage === 'T01'
              ? '小 A 的笔记'
              : stage === 'T10' && block.id === 'T10_FINAL_MAIL'
                ? '最后一封邮件'
                : blockPagePresentation?.title ?? currentPage?.sceneLabel ?? currentPage?.label ?? section.title;
            const scenePage = Boolean(currentPage?.sceneId);
            const coverAssetId = scenePage
              ? blockPagePresentation?.illustrationAssetId
              : blockPagePresentation?.illustrationAssetId ?? ((block.id === primaryBlock?.id || stage === 'T10') ? section.illustrationAssetId : undefined);
            const coverAlt = blockPagePresentation?.illustrationAlt
              ?? (scenePage ? coverTitle : ((block.id === primaryBlock?.id || stage === 'T10') ? section.illustrationAlt : undefined))
              ?? `${section.title}场景`;
            const coverSource = coverAssetId ? assetLoader.get(coverAssetId)?.src : undefined;
            const coverAvailable = Boolean(coverSource) && failedIllustrationAssetId !== coverAssetId;
            const coverPeriod = blockPagePresentation?.periodLabel ?? section.periodLabel;
            const visibleSegments = [
              currentPage,
              ...(pageIndex === pages.length - 1 ? segments.filter((item) => item.role === 'ending') : []),
            ].filter((item): item is NonNullable<typeof item> => Boolean(item));
            const isMailBlock = ['T02_ORIGINAL', 'T04_ORIGINAL', 'T08_RETURN', 'T09_REPLY_AND_LAST_PAGE', 'T10_FINAL_MAIL'].includes(block.id);
            const navLabel = stage === 'T01' && block.id === 'T01_ORIGINAL'
              ? '笔记页码'
              : stage === 'T03' && block.id === 'T03_ORIGINAL'
                ? '日期索引'
                : stage === 'T05' && block.id === 'T05_ORIGINAL'
                  ? '阅读分段'
                  : `${displayTitle}分段`;
            const mayContinueBlock = pageIndex === pages.length - 1 && (!coverRequired || coverOpen);
            const leadSegments = segments.filter((item) => item.role === 'lead');
            return <div className="a4-reader__block-stack" key={block.id}>
              <section
                className={`a4-reader__block a4-reader__block--${block.kind}${stage === 'T03' ? ' a4-reader__block--timeline' : ''}${isMailBlock ? ' a4-reader__block--email' : ''}`}
                data-block-id={block.id}
                data-source-ref-id={block.sourceRefId}
                data-content-kind={block.kind}
                data-presentation-kind={presentationKind}
                data-paragraph-count={block.paragraphs.length}
              >
                {stage === 'T01' && block.id === 'T01_ORIGINAL' && leadSegments.length > 0 && <details className="a4-reader__background-note" open={hotelBackgroundExpanded} onToggle={(event) => setHotelBackgroundExpanded(event.currentTarget.open)}>
                  <summary>回到酒店 · 故事开端</summary>
                  {renderVisibleSegments(block.id, block.paragraphs, undefined, leadSegments, 0, pages.length)}
                </details>}
                {stage !== 'T01' && leadSegments.length > 0 && renderVisibleSegments(block.id, block.paragraphs, undefined, leadSegments, 0, pages.length)}
                {showCover ? <section className="a4-reader__cover" data-cover-for={block.id} data-reader-active="true" aria-label={`${coverTitle}封面`} tabIndex={-1}>
                  <div className="a4-reader__cover-art" data-illustration-id={coverAssetId}>
                    {coverAvailable && coverSource ? <img src={coverSource} alt={coverAlt} onError={() => { if (coverAssetId) setFailedIllustrationAssetId(coverAssetId); }} /> : <div className="a4-reader__art-placeholder">{coverAlt}</div>}
                    {coverAvailable && coverSource && <button ref={zoomButtonRef} type="button" onClick={() => { setZoomedIllustration({ assetId: coverAssetId!, alt: coverAlt }); setZoomOpen(true); }}>放大配图</button>}
                  </div>
                  <div className="a4-reader__cover-copy">
                    <p>{coverPeriod}{isWangaoMemory ? ' · 王澳当时的亲历' : ''}</p>
                    <h3>{coverTitle}</h3>
                    <span>按下方按钮，翻开这一段。</span>
                  </div>
                </section> : <>
                {pages.length > 1 && <>
                  <nav className="a4-reader__pager" aria-label={navLabel}>
                    <button type="button" disabled={pageIndex === 0} onClick={() => {
                      const previousPageIndex = Math.max(0, pageIndex - 1);
                      markNotebookPageRead(block.id, previousPageIndex);
                      const update = () => persistReadingPosition({ activeBlockId: block.id, pageIndexByBlock: { ...pageIndexByBlock, [block.id]: previousPageIndex } });
                      if (pages[previousPageIndex]?.sceneId !== currentPage?.sceneId) transitionAct4View(update);
                      else update();
                    }}>上一页</button>
                    <span aria-live="polite">{pageIndex + 1} / {pages.length}</span>
                    <button type="button" disabled={pageIndex >= pages.length - 1} onClick={() => {
                      const nextPageIndex = Math.min(pages.length - 1, pageIndex + 1);
                      markNotebookPageRead(block.id, nextPageIndex);
                      const update = () => persistReadingPosition({ activeBlockId: block.id, pageIndexByBlock: { ...pageIndexByBlock, [block.id]: nextPageIndex } });
                      if (pages[nextPageIndex]?.sceneId !== currentPage?.sceneId) transitionAct4View(update);
                      else update();
                    }}>下一页</button>
                  </nav>
                  <details className="a4-reader__page-directory">
                    <summary>已读目录：{pageIndex + 1} / {pages.length}</summary>
                    <nav aria-label={`${navLabel}目录`}>
                      {pages.slice(0, pageIndex + 1).map((item, index) => {
                        const dateLabel = stage === 'T03' && block.id === 'T03_ORIGINAL' ? block.paragraphs[item.from] : item.label;
                        const label = stage === 'T10' && block.id === 'T10_FINAL_MAIL'
                          ? `最后一封邮件 · ${index + 1}/${pages.length}`
                          : item.scenePageCount && item.scenePageCount > 1
                          ? `${item.sceneLabel} · ${item.scenePageIndex! + 1}/${item.scenePageCount}`
                          : stage === 'T05' && block.id === 'T05_ORIGINAL'
                            ? item.label || `第 ${index + 1} 段`
                            : dateLabel || `第 ${index + 1} 页`;
                        return <button type="button" key={item.id} aria-current={pageIndex === index ? 'page' : undefined} onClick={() => {
                          markNotebookPageRead(block.id, index);
                        const update = () => persistReadingPosition({ activeBlockId: block.id, pageIndexByBlock: { ...pageIndexByBlock, [block.id]: index } });
                        if (pages[index]?.sceneId !== currentPage?.sceneId) transitionAct4View(update);
                        else update();
                        }}>{label}</button>;
                      })}
                    </nav>
                  </details>
                </>}
                {block.kind === 'adaptation-bridge'
                  ? <details className="a4-reader__bridge">
                    <summary>王澳当时记得的事</summary>
                    {renderVisibleSegments(block.id, block.paragraphs, currentPage, visibleSegments, pageIndex, pages.length)}
                  </details>
                  : renderVisibleSegments(block.id, block.paragraphs, currentPage, visibleSegments, pageIndex, pages.length)}
                </>}
              </section>
              {mayContinueBlock && renderInteractionAfter(block.id)}
            </div>;
          })}
        </div>

        {stage !== 'T10' && visibleExplanationIds.size > 0 && <div className="a4-reader__explanations" aria-label="故事回顾">
          {renderExplanationPanels(visibleExplanationIds)}
        </div>}

        {!reviewing && finalCompleted && <details className="a4-reader__final-recap" onToggle={(event) => setEndingRecapExpanded(event.currentTarget.open)}>
          <summary>展开人物、时间线与解释回顾</summary>
          {endingRecapExpanded && <div className="a4-reader__final-recap-content">{renderEndingRecap()}</div>}
        </details>}
      </article>

      {zoomOpen && zoomedIllustration && assetLoader.get(zoomedIllustration.assetId)?.src && createPortal(<div ref={dialogRef} className="a4-reader__zoom" role="dialog" aria-modal="true" aria-label="放大配图" onKeyDown={handleZoomKeyDown}>
        <button type="button" onClick={() => setZoomOpen(false)}>关闭配图，回到正文</button>
        <img src={assetLoader.get(zoomedIllustration.assetId)?.src} alt={zoomedIllustration.alt} />
      </div>, document.body)}
    </main>
  </InvestigationShell>;
}
