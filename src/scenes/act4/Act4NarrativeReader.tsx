import { memo, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { stateManager, type StateManager } from '../../core/stateManager';
import { useAppSelector } from '../../core/hooks/useAppSelector';
import { equalAct4ReaderSnapshot, selectAct4ReaderSnapshot } from '../../core/store/selectors';
import { act4NarrativeSections, act4NarrativeEnding, type Act4NarrativeBlock } from '../../data/narrative/act4Narrative';
import { act4OldMails } from '../../data/act4/mail';
import { assetLoader } from '../../core/assetLoader';
import { act4NarrativeActionsSatisfied, type ActiveAct4NarrativeStage } from '../../story/act4/narrativePolicy';
import { InvestigationShell } from '../../components/investigation/InvestigationShell';
import type { InvestigationAction } from '../../components/investigation/types';
import {
  act4PagePresentation,
  act4PresentationKind,
  act4PrivateBlogPosts,
  type Act4TextSegment,
} from '../../data/narrative/act4Presentation';
import { act4ReadingSpaceKey, sanitizeAct4ReadingPosition } from '../../core/readingPosition';
import { act4IllustrationDetailAssetIdForSource } from '../../data/narrative/act4IllustrationDetails';
import { getUiPreferences, setAct4ReadingPosition, subscribeUiPreferences } from '../../core/uiPreferences';
import { Act4PrivateBlog } from './Act4PrivateBlog';
import { runAct4ViewTransition as transitionAct4View } from '../../components/transition/sceneTransition';
import { blockedReason, readerPagesForBlock } from './reader/readerModel';
import { usePrivateBlogBookmarks } from './reader/blogPreferences';
import { useAct4ReaderSession } from './reader/useAct4ReaderSession';
import { Act4ReaderPager } from './reader/Act4ReaderPager';
import { Act4ReaderCover } from './reader/Act4ReaderCover';
import { Act4ReaderIllustrationDialog } from './reader/Act4ReaderIllustrationDialog';
import { Act4ReaderStoryBody } from './reader/Act4ReaderStoryBody';
import { Act4ReaderReviewPanels } from './reader/Act4ReaderReviewPanels';
import { advanceReaderStage } from './reader/stageActions';
import { migrateReaderLayoutPreferences, storedReaderPageIndex } from './reader/layoutPreferences';
import { deriveReaderVisibility } from './reader/readerVisibility';
import '../../act4/act4.css';

const perspectiveLabel = (perspective: 'investigator' | 'wangao') => perspective === 'wangao'
  ? '王澳当时的亲历'
  : '主角与小月的调查';

function Act4NarrativeReaderView({ manager = stateManager, onExit }: { manager?: StateManager; onExit: () => void }) {
  const selectedState = useAppSelector(manager, selectAct4ReaderSnapshot, equalAct4ReaderSnapshot);
  const state = selectedState.act4;
  const isComplete = selectedState.complete;
  const currentStage = state.stage;
  const [password, setPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [passwordHintLevel, setPasswordHintLevel] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomedIllustration, setZoomedIllustration] = useState<{ assetId?: string; alt: string } | null>(null);
  const [failedIllustrationAssetId, setFailedIllustrationAssetId] = useState<string | undefined>();
  const [hotelBackgroundExpanded, setHotelBackgroundExpanded] = useState(true);
  const [endingRecapExpanded, setEndingRecapExpanded] = useState(false);
  const [privateBlogOpen, setPrivateBlogOpen] = useState(false);
  const [completedBroadcastStageEpoch, setCompletedBroadcastStageEpoch] = useState<number | null>(null);
  const { bookmarkedDates: bookmarkedBlogDates, toggleBookmark } = usePrivateBlogBookmarks();
  const uiPreferences = useSyncExternalStore(subscribeUiPreferences, getUiPreferences, getUiPreferences);
  const readerRef = useRef<HTMLElement>(null);
  const currentStageEpochRef = useRef({ stage: currentStage, epoch: 0 });
  if (currentStageEpochRef.current.stage !== currentStage) {
    currentStageEpochRef.current = { stage: currentStage, epoch: currentStageEpochRef.current.epoch + 1 };
  }
  const dialogRef = useRef<HTMLDivElement>(null);
  const zoomButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const continueClickLockRef = useRef(false);
  const layoutMigrationStartedRef = useRef(false);
  const { reviewStage, reviewing, openReview, returnToCurrent, skipPageAutoScrollRef } = useAct4ReaderSession(readerRef, currentStage, transitionAct4View);
  const actions = state.completedNarrativeActionIds;
  const hasAction = (actionId: string | undefined) => actionId !== undefined && actions.includes(actionId as typeof actions[number]);

  const section = act4NarrativeSections.find((item) => item.stage === (reviewStage ?? currentStage));
  const stage = section?.stage ?? 'T01';
  const privateBlogView = stage === 'T03' && privateBlogOpen;
  const readingSpaceKey = act4ReadingSpaceKey(stage, reviewing ? 'review' : 'current') ?? `${stage}:current`;
  const storedReadingPosition = uiPreferences.act4Reading[readingSpaceKey];
  const storedPageIndex = (block: Act4NarrativeBlock, pages: readonly Act4TextSegment[]) => {
    const requested = storedReadingPosition?.pageIndexByBlock[block.id] ?? 0;
    return storedReaderPageIndex(stage, block, pages, requested);
  };

  useLayoutEffect(() => {
    if (layoutMigrationStartedRef.current) return;
    layoutMigrationStartedRef.current = true;
    migrateReaderLayoutPreferences();
  }, []);

  const focusPrivateBlog = () => {
    const stream = readerRef.current?.querySelector<HTMLElement>('.a4-private-blog__feed');
    const scene = readerRef.current?.closest<HTMLElement>('.investigation-shell__scene');
    if (!stream || !scene) return;
    stream.focus({ preventScroll: true });
    scene.scrollTop += stream.getBoundingClientRect().top - scene.getBoundingClientRect().top - 18;
  };

  const togglePrivateBlog = (open: boolean) => transitionAct4View(() => setPrivateBlogOpen(open));

  function continueCurrentSection(expectedStage: ActiveAct4NarrativeStage): void {
    if (continueClickLockRef.current) return;
    continueClickLockRef.current = true;
    window.setTimeout(() => { continueClickLockRef.current = false; }, 500);
    advanceReaderStage(manager, expectedStage, transitionAct4View);
  }

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
    if (state.stage === 'T10' && state.completedNarrativeSectionIds.includes('A4_READ_T10') && isComplete) setEndingRecapExpanded(true);
  }, [state.completedNarrativeSectionIds, state.stage, isComplete]);
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
  const finalCompleted = stage === 'T10' && sectionCompleted && isComplete;
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
  const mustFinishLastConsciousness = !reviewing && stage === 'T09' && activeReadingTarget?.blockId === 'T09_BROADCAST';
  const lastConsciousnessComplete = completedBroadcastStageEpoch === currentStageEpochRef.current.epoch;
  const currentReadingReady = actionCompleted && (!mustFinishLastConsciousness || lastConsciousnessComplete);
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
      state: finalCompleted ? 'completed' : currentReadingReady ? 'ready' : 'blocked',
      reason: currentReadingReady ? undefined : !actionCompleted ? blockedReason[stage] ?? '先读完这一段，再继续。' : '按顺序听完广播与最后一句，再继续。',
      onActivate: () => continueCurrentSection(stage),
    };

  const t05PartialRecapAvailable = stage === 'T05' && Boolean(primaryPage && primaryPage.from >= 8)
    && activeReadingTarget?.blockId === primaryBlock?.id && activeReadingTarget.coverOpen;
  const { visibleExplanationIds } = deriveReaderVisibility({
    visibleBlocks,
    pageTargets,
    sectionExplanationId: section.explanationId,
    partialRecapAvailable: t05PartialRecapAvailable,
    explanationRevealAllowed: !section.explanationRevealAfterActionId || hasAction(section.explanationRevealAfterActionId),
  });
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

  const renderExplanationPanels = (ids: Iterable<string>) => <Act4ReaderReviewPanels
    ids={ids}
    stage={stage}
    recapSentenceLimit={t05RecapSentenceLimit}
    completedSectionIds={completedSectionIds}
    textBySection={textBySection}
    onReview={openReview}
  />;

  const renderVisibleSegments = (blockId: string, paragraphs: string[], currentPage: Act4TextSegment | undefined, visibleSegments: Act4TextSegment[], pageIndex: number, pageCount: number, focusCurrentPage = true) => <Act4ReaderStoryBody
    stage={stage}
    blockId={blockId}
    paragraphs={paragraphs}
    currentPage={currentPage}
    visibleSegments={visibleSegments}
    pageIndex={pageIndex}
    pageCount={pageCount}
    focusCurrentPage={focusCurrentPage}
    onBroadcastCompleteChange={!reviewing ? (complete) => setCompletedBroadcastStageEpoch(complete ? currentStageEpochRef.current.epoch : null) : undefined}
  />;

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

  const zoomIllustrationSource = zoomedIllustration?.assetId ? assetLoader.get(zoomedIllustration.assetId)?.src : undefined;

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
                      onToggleBookmark={toggleBookmark}
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
                {showCover ? <Act4ReaderCover
                  blockId={block.id}
                  assetId={coverAssetId}
                  source={coverAvailable ? coverSource : undefined}
                  alt={coverAlt}
                  period={coverPeriod}
                  title={coverTitle}
                  wangaoMemory={isWangaoMemory}
                  zoomButtonRef={zoomButtonRef}
                  onImageError={() => { if (coverAssetId) setFailedIllustrationAssetId(coverAssetId); }}
                  onZoom={() => { setZoomedIllustration({ assetId: act4IllustrationDetailAssetIdForSource(coverAssetId!) ?? coverAssetId!, alt: coverAlt }); setZoomOpen(true); }}
                /> : <>
                {pages.length > 1 && <Act4ReaderPager
                  stage={stage}
                  blockId={block.id}
                  paragraphs={block.paragraphs}
                  pages={pages}
                  pageIndex={pageIndex}
                  navLabel={navLabel}
                  onSelectPage={(selectedIndex) => {
                    markNotebookPageRead(block.id, selectedIndex);
                    const update = () => persistReadingPosition({ activeBlockId: block.id, pageIndexByBlock: { ...pageIndexByBlock, [block.id]: selectedIndex } });
                    if (pages[selectedIndex]?.sceneId !== currentPage?.sceneId) transitionAct4View(update);
                    else update();
                  }}
                />}
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

      {zoomOpen && zoomedIllustration && <Act4ReaderIllustrationDialog
        source={zoomIllustrationSource}
        alt={zoomedIllustration.alt}
        fallback={`${zoomedIllustration.alt}的独立放大近景暂不可用。`}
        dialogRef={dialogRef}
        onKeyDown={handleZoomKeyDown}
        onClose={() => setZoomOpen(false)}
      />}
    </main>
  </InvestigationShell>;
}

export const Act4NarrativeReader = memo(Act4NarrativeReaderView);
