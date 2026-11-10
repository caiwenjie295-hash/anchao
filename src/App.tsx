import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ComponentProps, ComponentType, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import desktopWallpaperUrl from './assets/compressed/assets/desktop-wallpaper.webp?no-inline';
import { stateManager } from './core/stateManager';
import { readSave } from './core/saveManager';
import { eventBus } from './core/eventBus';
import type { AppId } from './core/types';
import { apps, appById } from './data/apps';
import { AppWindow } from './components/AppWindow';
import { DesktopIcon } from './components/DesktopIcon';
import { DesktopTaskCard } from './components/DesktopTaskCard';
import { ResourcePreparationDialog } from './components/fieldNotes/ResourcePreparationDialog';
import { InvestigationProgressDrawer } from './components/InvestigationProgressDrawer';
import { SaveRecoveryNotice } from './components/recovery/SaveRecoveryNotice';
import { ChapterNavigation } from './components/chapterNavigation/ChapterNavigation';
import type { ChapterId } from './core/chapterNavigation';
import { InvestigationProgressProvider } from './components/InvestigationProgressContext';
import { Taskbar } from './components/Taskbar';
import { Act1PhaseBController } from './story/act1PhaseBController';
import { Act1PhaseCController } from './story/act1PhaseCController';
import { Act1PhaseEFController } from './story/act1PhaseEFController';
import { Act1PhaseGHIController } from './story/act1PhaseGHIController';
import { Act1PhaseJKController } from './story/act1PhaseJKController';
import { Act2T01Controller } from './story/act2T01Controller';
import { Act2T06Controller } from './story/act2T06Controller';
import { Act1SceneExperience } from './scenes/act1/Act1SceneExperience';
import { Act1Ending } from './scenes/act1/Act1Ending';
import { Act2Experience } from './scenes/act2/Act2Experience';
import { Act3Investigation } from './scenes/act3/Act3Investigation';
import { Act4Experience } from './scenes/act4/Act4Experience';
import { Act4Ending } from './scenes/act4/Act4Ending';
import { Act2T07Entry } from './scenes/act2/T07Investigation';
import { StoryTransition, StoryTransitionLaunch } from './components/StoryTransition';
import { getPendingStoryTransition } from './data/storyTransitionData';
import { deriveInvestigationProgress } from './data/investigationProgressData';
import { act1Scenes } from './data/sceneData';
import { SceneTransitionLayer } from './components/transition/SceneTransitionLayer';
import { runAppSceneTransition as runSceneTransition } from './components/transition/sceneTransition';
import { backgroundMusicPlayer } from './media/backgroundMusicPlayer';
import { OpeningPrelude } from './components/scenePolish/OpeningPrelude';
import { shouldShowOpeningPrelude } from './components/scenePolish/openingPreludeData';
import { fitWindowBesideTaskRail } from './components/scenePolish/desktopTaskRailLayout';
import { shouldRenderAct1Scene } from './components/scenePolish/act1ScenePresentation';
import { deriveAppView, isAct2SceneStage, type Act2SceneStage } from './core/presentation/appView';
import { describeStartupError, loadError } from './startup/errors';
import { getStartupGroupReadiness } from './startup/groupReadiness';
import type { StartupGroup } from './startup/preload';
import './styles.css';
import './imageAssets.css';
import './components/sceneTransition.css';
import './components/scenePolish/scenePolish.css';
import './design/theme.css';
import './design/applications.css';
import './design/evidence.css';

type SelectableDesktopIconProps = ComponentProps<typeof DesktopIcon> & { selected?: boolean; onSelect?: () => void };
const SelectableDesktopIcon = DesktopIcon as ComponentType<SelectableDesktopIconProps>;

export default function App() {
  const state = useSyncExternalStore(stateManager.subscribe, stateManager.getState, stateManager.getState);
  const recoveryState = useSyncExternalStore(stateManager.subscribeRecoveryState, stateManager.getRecoveryState, stateManager.getRecoveryState);
  const [time, setTime] = useState(() => new Date());
  // “已返回桌面”只是瞬时显示状态；阶段一变或清零即刻失效。
  const [dismissedAct2Stage, setDismissedAct2Stage] = useState<Act2SceneStage | null>(null);
  const [dismissedAct1SceneId, setDismissedAct1SceneId] = useState<string | null>(null);
  const [showAct1JourneyIntro, setShowAct1JourneyIntro] = useState(false);
  const departureOriginRef = useRef<HTMLElement | null>(null);
  const pendingDepartureFocusRestoreRef = useRef<HTMLElement | null>(null);
  const [dismissedAct3, setDismissedAct3] = useState(false);
  const [reviewAct3, setReviewAct3] = useState(false);
  const [dismissedAct4, setDismissedAct4] = useState(false);
  const [showAct4Ending, setShowAct4Ending] = useState(false);
  const [openedTransitionId, setOpenedTransitionId] = useState<string | null>(null);
  const [showOpeningPrelude, setShowOpeningPrelude] = useState(() => shouldShowOpeningPrelude(readSave().kind));
  const [selectedAppId, setSelectedAppId] = useState<AppId | null>(null);
  const [taskCardExpanded, setTaskCardExpanded] = useState(false);
  const [viewport, setViewport] = useState(() => typeof window === 'undefined'
    ? { width: 1280, height: 900 }
    : { width: window.innerWidth, height: window.innerHeight });
  const [saveImportNoticeVisible, setSaveImportNoticeVisible] = useState(false);
  const [act4EndingNavigationHost, setAct4EndingNavigationHost] = useState<HTMLElement | null>(null);
  const [sceneNavigationHost, setSceneNavigationHost] = useState<HTMLElement | null>(null);
  const [resourceWait, setResourceWait] = useState<{ groups: StartupGroup[]; title: string; error: string } | null>(null);
  const resourceWaitRef = useRef<{ groups: StartupGroup[]; title: string; action: () => void; token: number } | null>(null);
  const resourceWaitTokenRef = useRef(0);
  const saveImportNoticeTimerRef = useRef<number | null>(null);
  const act4WasCompleteRef = useRef(state.game.flags.FLAG_A4_COMPLETE === true);
  useEffect(() => {
    const completeNow = state.game.flags.FLAG_A4_COMPLETE === true;
    if (!act4WasCompleteRef.current && completeNow) setShowAct4Ending(true);
    act4WasCompleteRef.current = completeNow;
  }, [state.game.flags.FLAG_A4_COMPLETE]);
  useEffect(() => {
    const interval = window.setInterval(() => setTime(new Date()), 15_000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => backgroundMusicPlayer.mount(), []);
  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);
  useEffect(() => {
    const unsubscribe = eventBus.on('save:imported', () => {
      const imported = stateManager.getState();
      const atUnseenOpening = imported.game.act === 1
        && imported.game.phase === 'A'
        && !imported.modules.scene.journeyStarted
        && imported.modules.act2Research.stage === 'inactive'
        && imported.modules.act3.stage === 'inactive'
        && imported.modules.act4.stage === 'inactive'
        && !imported.modules.storyTransitions.seenIds.includes('TRANSITION_A1_INTRO');
      setShowOpeningPrelude(atUnseenOpening);
      setOpenedTransitionId(null);
      setShowAct1JourneyIntro(false);
      setSaveImportNoticeVisible(true);
      if (saveImportNoticeTimerRef.current !== null) window.clearTimeout(saveImportNoticeTimerRef.current);
      saveImportNoticeTimerRef.current = window.setTimeout(() => {
        saveImportNoticeTimerRef.current = null;
        setSaveImportNoticeVisible(false);
      }, 8_000);
    });
    return () => {
      unsubscribe();
      if (saveImportNoticeTimerRef.current !== null) window.clearTimeout(saveImportNoticeTimerRef.current);
    };
  }, []);
  useEffect(() => {
    if (!showAct4Ending) { setAct4EndingNavigationHost(null); return; }
    const frame = window.requestAnimationFrame(() => setAct4EndingNavigationHost(document.querySelector<HTMLElement>('.act4-ending')));
    return () => window.cancelAnimationFrame(frame);
  }, [showAct4Ending]);
  useEffect(() => {
    const phaseBController = new Act1PhaseBController();
    const phaseCController = new Act1PhaseCController();
    const phaseEFController = new Act1PhaseEFController();
    const phaseGHIController = new Act1PhaseGHIController();
    const phaseJKController = new Act1PhaseJKController();
    const act2T01Controller = new Act2T01Controller();
    const act2T06Controller = new Act2T06Controller();
    phaseBController.start();
    phaseCController.start();
    phaseEFController.start();
    phaseGHIController.start();
    phaseJKController.start();
    act2T01Controller.start();
    act2T06Controller.start();
    return () => {
      act2T06Controller.dispose();
      act2T01Controller.dispose();
      phaseJKController.dispose();
      phaseGHIController.dispose();
      phaseEFController.dispose();
      phaseCController.dispose();
      phaseBController.dispose();
    };
  }, []);

  const act2Stage = state.modules.act2Research.stage;
  const view = deriveAppView(state, { dismissedAct2Stage, dismissedAct3, reviewAct3, dismissedAct4, showAct1JourneyIntro });

  const beginResourcePreparation = useCallback((groups: StartupGroup[], title: string, action: () => void) => {
    const readiness = getStartupGroupReadiness();
    if (!readiness) { action(); return; }
    const token = ++resourceWaitTokenRef.current;
    const pending = { groups, title, action, token };
    resourceWaitRef.current = pending;
    setResourceWait({ groups, title, error: '' });
    void readiness.requestGroups(groups, 20).then(() => {
      if (resourceWaitRef.current?.token !== token) return;
      resourceWaitRef.current = null;
      setResourceWait(null);
      action();
    }).catch((reason: unknown) => {
      if (resourceWaitRef.current?.token !== token) return;
      setResourceWait({ groups, title, error: describeStartupError(loadError(reason, title)) });
    });
  }, []);

  const cancelResourcePreparation = useCallback(() => {
    resourceWaitTokenRef.current += 1;
    resourceWaitRef.current = null;
    setResourceWait(null);
  }, []);

  const retryResourcePreparation = useCallback(() => {
    const pending = resourceWaitRef.current;
    if (pending) beginResourcePreparation(pending.groups, pending.title, pending.action);
  }, [beginResourcePreparation]);

  useEffect(() => () => { resourceWaitTokenRef.current += 1; resourceWaitRef.current = null; }, []);

  useEffect(() => {
    if (state.game.phase !== 'F' || state.modules.scene.journeyStarted) setShowAct1JourneyIntro(false);
  }, [state.game.phase, state.modules.scene.journeyStarted]);

  // 清零或离开第二幕场景阶段时，丢弃旧的“已返回桌面”标记，避免污染下一次游玩。
  useEffect(() => {
    if (!isAct2SceneStage(act2Stage)) setDismissedAct2Stage(null);
  }, [act2Stage]);
  useEffect(() => {
    if (dismissedAct1SceneId && state.modules.scene.currentSceneId !== dismissedAct1SceneId) setDismissedAct1SceneId(null);
  }, [dismissedAct1SceneId, state.modules.scene.currentSceneId]);

  const openApp = useCallback((appId: AppId) => stateManager.openApp(appId), []);
  const taskbarClick = (appId: AppId) => stateManager.toggleTaskbarApp(appId);
  // 第二幕收尾页与任务栏「调查」共用同一语义：只有第二幕已完成且第三幕未开始时才启动，
  // 避免出现第二个能改写阶段的入口（工单 §15.2 FLOW-05）。
  const startAct3FromInvestigation = useCallback(() => {
    const current = stateManager.getState();
    if (current.game.flags.FLAG_A2_COMPLETE !== true || current.modules.act3.stage !== 'inactive') return;
    beginResourcePreparation(['shared', 'act3'], '正在准备第三幕资源', () => runSceneTransition(() => {
      setDismissedAct2Stage(null);
      stateManager.startAct3();
      setDismissedAct3(false);
    }));
  }, [beginResourcePreparation]);
  const startAct4FromInvestigation = useCallback(() => {
    const current = stateManager.getState();
    if (current.game.flags.FLAG_A3_COMPLETE !== true || current.game.flags.FLAG_A3_SITE_EXITED !== true || current.modules.act3.stage !== 'T07') return;
    beginResourcePreparation(['shared', 'act4'], '正在准备第四幕资源', () => runSceneTransition(() => {
      if (current.modules.act4.stage === 'inactive') stateManager.startAct4();
      setReviewAct3(false);
      setDismissedAct3(false);
      setDismissedAct4(false);
    }));
  }, [beginResourcePreparation]);
  const reviewAct3FromInvestigation = useCallback(() => {
    const current = stateManager.getState();
    if (current.game.flags.FLAG_A3_COMPLETE !== true || current.modules.act3.stage !== 'T07') return;
    runSceneTransition(() => {
      setReviewAct3(true);
      setDismissedAct3(false);
      if (current.modules.act4.stage !== 'inactive') setDismissedAct4(true);
    });
  }, []);
  const continueInvestigation = useCallback(() => {
    const current = stateManager.getState();
    const pending = getPendingStoryTransition(current);
    if (pending && pending.presentation !== 'immediate') {
      setOpenedTransitionId(pending.id);
      return;
    }
    if (current.modules.scene.currentSceneId !== null) {
      if (current.modules.scene.currentSceneId === dismissedAct1SceneId) runSceneTransition(() => setDismissedAct1SceneId(null));
      return;
    }
    if (current.modules.act4.stage !== 'inactive') {
      runSceneTransition(() => {
        setReviewAct3(false);
        setDismissedAct4(false);
      });
      return;
    }
    if (current.modules.act3.stage !== 'inactive') {
      if (current.game.flags.FLAG_A3_COMPLETE === true && current.game.flags.FLAG_A3_SITE_EXITED === true) startAct4FromInvestigation();
      else runSceneTransition(() => { setReviewAct3(false); setDismissedAct3(false); });
      return;
    }
    if (current.game.flags.FLAG_A2_COMPLETE === true) {
      startAct3FromInvestigation();
      return;
    }
    const act2StageNow = current.modules.act2Research.stage;
    if (act2StageNow !== 'inactive') {
      if (isAct2SceneStage(act2StageNow)) runSceneTransition(() => setDismissedAct2Stage(null));
      else openApp('browser');
      return;
    }
    if (current.game.phase === 'F' && !current.modules.scene.journeyStarted) {
      departureOriginRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setShowAct1JourneyIntro(true);
      return;
    }
    const currentProgress = deriveInvestigationProgress(current);
    if (currentProgress.nextActionAppId) openApp(currentProgress.nextActionAppId);
  }, [dismissedAct1SceneId, openApp, startAct3FromInvestigation, startAct4FromInvestigation]);
  const openDepartureIntro = useCallback((origin: HTMLElement | null) => {
    const current = stateManager.getState();
    if (current.game.phase !== 'F' || current.modules.scene.journeyStarted) return;
    departureOriginRef.current = origin;
    setShowAct1JourneyIntro(true);
  }, []);
  const cancelDepartureIntro = useCallback(() => {
    pendingDepartureFocusRestoreRef.current = departureOriginRef.current;
    departureOriginRef.current = null;
    setShowAct1JourneyIntro(false);
  }, []);
  useLayoutEffect(() => {
    if (showAct1JourneyIntro) return;
    const origin = pendingDepartureFocusRestoreRef.current;
    pendingDepartureFocusRestoreRef.current = null;
    if (origin?.isConnected && !origin.closest('[inert]')) origin.focus({ preventScroll: true });
  }, [showAct1JourneyIntro]);
  const returnFromAct1Scene = useCallback(() => {
    const currentSceneId = stateManager.getState().modules.scene.currentSceneId;
    if (currentSceneId) runSceneTransition(() => setDismissedAct1SceneId(currentSceneId));
  }, []);
  const resumeAct1Scene = useCallback(() => runSceneTransition(() => setDismissedAct1SceneId(null)), []);
  const restartProgress = useCallback(() => {
    if (!stateManager.resetProgress()) return false;
    setShowOpeningPrelude(true);
    setShowAct1JourneyIntro(false);
    setOpenedTransitionId(null);
    setDismissedAct1SceneId(null);
    setDismissedAct2Stage(null);
    setDismissedAct3(false);
    setReviewAct3(false);
    setDismissedAct4(false);
    setShowAct4Ending(false);
    setTaskCardExpanded(false);
    setAct4EndingNavigationHost(null);
    return true;
  }, []);
  const replayChapter = useCallback((chapter: ChapterId) => {
    setShowOpeningPrelude(chapter === 1);
    setShowAct1JourneyIntro(false);
    setOpenedTransitionId(null);
    setDismissedAct1SceneId(null);
    setDismissedAct2Stage(null);
    setDismissedAct3(false);
    setReviewAct3(false);
    setDismissedAct4(false);
    setShowAct4Ending(false);
    setTaskCardExpanded(false);
    setSelectedAppId(null);
    setAct4EndingNavigationHost(null);
  }, []);
  const { act1SceneOpen: act1SceneReached, act2SceneStage, act3Stage, act3Active, act4Active, act4Open, act3Open, act2SceneOpen, sceneOpen: derivedSceneOpen, desktopLabel } = view;
  const act1SceneOpen = shouldRenderAct1Scene(act1SceneReached, state.modules.scene.currentSceneId, dismissedAct1SceneId);
  const sceneOpen = derivedSceneOpen && (!act1SceneReached || act1SceneOpen);
  const transition = getPendingStoryTransition(state);
  const transitionOpen = transition !== null && (transition.presentation === 'immediate' || openedTransitionId === transition.id);
  const preludeOpen = transition?.id === 'TRANSITION_A1_INTRO' && showOpeningPrelude;
  const curtainOpen = transitionOpen || preludeOpen;
  useEffect(() => {
    setSceneNavigationHost(null);
    if (!sceneOpen || curtainOpen || showAct4Ending || recoveryState.kind !== 'none') return;
    const frame = window.requestAnimationFrame(() => {
      setSceneNavigationHost(document.querySelector<HTMLElement>('.investigation-shell__header-actions, .act1-scene__header-actions'));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [act2SceneStage, act3Stage, curtainOpen, recoveryState.kind, sceneOpen, showAct4Ending, state.modules.scene.currentSceneId]);
  const continueTransition = () => {
    if (!transition) return;
    stateManager.acknowledgeStoryTransition(transition.id);
    if (transition.targetAppId) stateManager.openApp(transition.targetAppId);
    setOpenedTransitionId(null);
  };
  const transitionLayer = transition && (preludeOpen
    ? <OpeningPrelude onBegin={() => { setShowOpeningPrelude(false); setOpenedTransitionId(transition.id); }} />
    : transitionOpen
      ? <StoryTransition key={transition.id} transition={transition} onContinue={continueTransition} />
      : null);
  const saveImportNotice = saveImportNoticeVisible && <div role="status" aria-live="polite" style={{ position: 'fixed', zIndex: 4000, top: 'max(12px, env(safe-area-inset-top))', right: 12, width: 'min(360px, calc(100vw - 24px))', padding: '13px 16px', border: '1px solid #55745f', borderRadius: 6, color: '#263a2d', background: '#eef4ef', boxShadow: '0 8px 24px #15251f30', lineHeight: 1.5 }}>存档已应用并写入这台设备。</div>;
  const openProgressApp = useCallback((appId: AppId) => {
    if (appId !== 'notepad') { openApp(appId); return; }
    const current = stateManager.getState();
    if (current.modules.scene.currentSceneId !== null || (current.game.phase === 'F' && !current.modules.scene.journeyStarted)) return;
    runSceneTransition(() => {
      const currentAct2Stage = current.modules.act2Research.stage;
      if (isAct2SceneStage(currentAct2Stage)) setDismissedAct2Stage(currentAct2Stage);
      if (current.modules.act3.stage !== 'inactive') {
        setDismissedAct3(true);
        setReviewAct3(false);
      }
      if (current.modules.act4.stage !== 'inactive') setDismissedAct4(true);
      stateManager.openApp('notepad');
    });
  }, []);
  const exitAct4 = useCallback(() => runSceneTransition(() => setDismissedAct4(true)), []);
  if (view.act1EndingOpen) {
    return <InvestigationProgressProvider state={state} suppressed={curtainOpen || showAct4Ending} currentContentActive onContinueInvestigation={continueInvestigation} onReviewAct3={reviewAct3FromInvestigation}><>
      <div className="act1-ending-flow" aria-hidden={curtainOpen} inert={curtainOpen}><Act1Ending onContinue={() => beginResourcePreparation(['shared', 'act2'], '正在准备第二幕资源', () => runSceneTransition(() => stateManager.startSecondAct()))} />{transition && !transitionOpen && <div className="act1-ending-flow__next"><StoryTransitionLaunch transition={transition} onOpen={() => setOpenedTransitionId(transition.id)} /></div>}</div>
      <InvestigationProgressDrawer state={state} />
      {resourceWait && getStartupGroupReadiness() && <ResourcePreparationDialog readiness={getStartupGroupReadiness()!} groups={resourceWait.groups} title={resourceWait.title} error={resourceWait.error} onRetry={retryResourcePreparation} onCancel={cancelResourcePreparation} />}
      {!curtainOpen && recoveryState.kind === 'none' && <ChapterNavigation placement="ending" onReplay={replayChapter} onReset={restartProgress} />}
      {transitionLayer}
      {saveImportNotice}
    </></InvestigationProgressProvider>;
  }
  const taskCardVisible = true;
  const dismissedAct1Scene = dismissedAct1SceneId && dismissedAct1SceneId === state.modules.scene.currentSceneId
    ? act1Scenes.find((scene) => scene.id === dismissedAct1SceneId)
    : undefined;
  const desktopStyle: CSSProperties = {
    backgroundImage: `url("${desktopWallpaperUrl}")`,
    ...(viewport.width < 900 ? { '--desktop-task-card-reserve': `${taskCardExpanded ? 244 : 104}px` } as CSSProperties : {}),
  };
  return (
    <InvestigationProgressProvider state={state} suppressed={curtainOpen || showAct4Ending} currentContentActive={sceneOpen} onOpenApp={openProgressApp} onContinueInvestigation={continueInvestigation} onReviewAct3={reviewAct3FromInvestigation}>
    <>
    <div aria-hidden={curtainOpen || showAct4Ending} inert={curtainOpen || showAct4Ending}>
    <main className={`desktop${sceneOpen ? ' desktop--scene-hidden' : ''}${taskCardVisible ? ' desktop--task-card-visible' : ''}${taskCardExpanded ? ' desktop--task-card-expanded' : ''}`} style={desktopStyle} data-asset-id="IMG_A1_A_001" aria-label={desktopLabel} aria-hidden={sceneOpen} inert={sceneOpen ? true : undefined} onClick={(event) => { const target = event.target as HTMLElement; if (target === event.currentTarget || target.classList.contains('desktop__icons')) setSelectedAppId(null); }}>
      <a className="skip-link" href="#taskbar">跳到任务栏</a>
      <h1 className="sr-only">{desktopLabel}</h1>
      <div className="desktop__icons" aria-label="桌面应用">
        {apps.map((app) => <SelectableDesktopIcon key={app.appId} app={app} onOpen={() => openApp(app.appId)} selected={selectedAppId === app.appId} onSelect={() => setSelectedAppId(app.appId)} />)}
      </div>
      {taskCardVisible && <DesktopTaskCard state={state} onOpenApp={openApp} expanded={taskCardExpanded} onExpandedChange={setTaskCardExpanded} onPrepareDeparture={openDepartureIntro} onResumeScene={dismissedAct1Scene ? resumeAct1Scene : undefined} resumeSceneLabel={dismissedAct1Scene ? `回到${dismissedAct1Scene.title}现场` : undefined} />}
      {/* T07 入口只在 T06 收束后出现；必须玩家主动点击才进入。 */}
      <Act2T07Entry manager={stateManager} />
      {apps.map((app) => {
        const windowState = state.desktop.windows[app.appId];
        return windowState.status === 'closed' || windowState.status === 'minimized' ? null : (
          <AppWindow
            key={app.appId}
            app={appById[app.appId]}
            windowState={fitWindowBesideTaskRail(windowState, viewport, taskCardExpanded)}
            active={state.desktop.activeAppId === app.appId}
            onFocus={() => stateManager.focusWindow(app.appId)}
            onMinimize={() => stateManager.minimizeWindow(app.appId)}
            onToggleMaximize={() => stateManager.toggleMaximize(app.appId)}
            onClose={() => stateManager.closeWindow(app.appId)}
            onBoundsChange={(bounds) => stateManager.setBounds(app.appId, fitWindowBesideTaskRail({ ...windowState, bounds }, viewport, taskCardExpanded).bounds)}
          />
        );
      })}
      <div id="taskbar" tabIndex={-1}><Taskbar desktop={state.desktop} onAppClick={taskbarClick} time={time} chapterNavigation={!sceneOpen && !curtainOpen && !showAct4Ending && recoveryState.kind === 'none' ? <ChapterNavigation placement="taskbar" onReplay={replayChapter} onReset={restartProgress} /> : undefined} /></div>
    </main>
    {act1SceneOpen && <SceneTransitionLayer key={state.modules.scene.journeyStarted ? state.modules.scene.currentSceneId ?? 'journey' : 'journey'}><Act1SceneExperience state={state} onSceneTransition={runSceneTransition} onReturnToDesktop={returnFromAct1Scene} onCancelJourneyIntro={cancelDepartureIntro} /></SceneTransitionLayer>}
    {act2SceneStage !== null && !act3Active && (
      <SceneTransitionLayer key={`${act2SceneStage}-${act2SceneOpen ? 'open' : 'resume'}`}>
        <Act2Experience
          stage={act2SceneStage}
          sceneOpen={act2SceneOpen}
          onDismissScene={() => runSceneTransition(() => setDismissedAct2Stage(act2SceneStage))}
          onResumeScene={() => runSceneTransition(() => setDismissedAct2Stage(null))}
          onEnterAct3={startAct3FromInvestigation}
          manager={stateManager}
        />
      </SceneTransitionLayer>
    )}
    {act3Active && (!act4Active || dismissedAct4) && (state.game.flags.FLAG_A3_COMPLETE !== true || reviewAct3 || (state.game.flags.FLAG_A3_SITE_EXITED === true && act3Stage === 'T07')) && (
      <>
        {act3Open && (
          <SceneTransitionLayer><Act3Investigation
            manager={stateManager}
            onReturnToDesktop={() => runSceneTransition(() => { setDismissedAct3(true); setReviewAct3(false); })}
            onOpenAct4={startAct4FromInvestigation}
          /></SceneTransitionLayer>
        )}
      </>
    )}
    {act4Open && <SceneTransitionLayer><Act4Experience manager={stateManager} onExit={exitAct4} /></SceneTransitionLayer>}
    </div>
    {showAct4Ending && <Act4Ending onReview={() => setShowAct4Ending(false)} onReturnToDesktop={() => { setShowAct4Ending(false); setDismissedAct4(true); }} />}
    {showAct4Ending && act4EndingNavigationHost && recoveryState.kind === 'none' && createPortal(<ChapterNavigation placement="ending" onReplay={replayChapter} onReset={restartProgress} />, act4EndingNavigationHost)}
    <InvestigationProgressDrawer state={state} />
    {sceneOpen && !curtainOpen && !showAct4Ending && recoveryState.kind === 'none' && (sceneNavigationHost
      ? createPortal(<ChapterNavigation placement="header" onReplay={replayChapter} onReset={restartProgress} />, sceneNavigationHost)
      : <ChapterNavigation placement="scene" onReplay={replayChapter} onReset={restartProgress} />)}
    {transitionLayer}
    {saveImportNotice}
    <SaveRecoveryNotice manager={stateManager} />
    {resourceWait && getStartupGroupReadiness() && <ResourcePreparationDialog readiness={getStartupGroupReadiness()!} groups={resourceWait.groups} title={resourceWait.title} error={resourceWait.error} onRetry={retryResourcePreparation} onCancel={cancelResourcePreparation} />}
    </>
    </InvestigationProgressProvider>
  );
}
