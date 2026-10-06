import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ComponentProps, ComponentType, CSSProperties } from 'react';
import desktopWallpaperUrl from './assets/compressed/assets/desktop-wallpaper.webp?no-inline';
import { stateManager } from './core/stateManager';
import { eventBus } from './core/eventBus';
import type { AppId } from './core/types';
import { apps, appById } from './data/apps';
import { AppWindow } from './components/AppWindow';
import { DesktopIcon } from './components/DesktopIcon';
import { DesktopTaskCard } from './components/DesktopTaskCard';
import { InvestigationProgressDrawer } from './components/InvestigationProgressDrawer';
import { SaveRecoveryNotice } from './components/recovery/SaveRecoveryNotice';
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
import { deriveAppView, isAct2SceneStage, type Act2SceneStage } from './core/presentation/appView';
import './styles.css';
import './imageAssets.css';
import './components/sceneTransition.css';

type SelectableDesktopIconProps = ComponentProps<typeof DesktopIcon> & { selected?: boolean; onSelect?: () => void };
const SelectableDesktopIcon = DesktopIcon as ComponentType<SelectableDesktopIconProps>;

export default function App() {
  const state = useSyncExternalStore(stateManager.subscribe, stateManager.getState, stateManager.getState);
  const [time, setTime] = useState(() => new Date());
  // “已返回桌面”只是瞬时显示状态；阶段一变或清零即刻失效。
  const [dismissedAct2Stage, setDismissedAct2Stage] = useState<Act2SceneStage | null>(null);
  const [dismissedAct3, setDismissedAct3] = useState(false);
  const [reviewAct3, setReviewAct3] = useState(false);
  const [dismissedAct4, setDismissedAct4] = useState(false);
  const [showAct4Ending, setShowAct4Ending] = useState(false);
  const [openedTransitionId, setOpenedTransitionId] = useState<string | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<AppId | null>(null);
  const [saveImportNoticeVisible, setSaveImportNoticeVisible] = useState(false);
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
  useEffect(() => {
    const unsubscribe = eventBus.on('save:imported', () => {
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
  const view = deriveAppView(state, { dismissedAct2Stage, dismissedAct3, reviewAct3, dismissedAct4 });

  // 清零或离开第二幕场景阶段时，丢弃旧的“已返回桌面”标记，避免污染下一次游玩。
  useEffect(() => {
    if (!isAct2SceneStage(act2Stage)) setDismissedAct2Stage(null);
  }, [act2Stage]);

  const openApp = useCallback((appId: AppId) => stateManager.openApp(appId), []);
  const taskbarClick = (appId: AppId) => stateManager.toggleTaskbarApp(appId);
  // 第二幕收尾页与任务栏「调查」共用同一语义：只有第二幕已完成且第三幕未开始时才启动，
  // 避免出现第二个能改写阶段的入口（工单 §15.2 FLOW-05）。
  const startAct3FromInvestigation = useCallback(() => {
    const current = stateManager.getState();
    if (current.game.flags.FLAG_A2_COMPLETE !== true || current.modules.act3.stage !== 'inactive') return;
    runSceneTransition(() => {
      setDismissedAct2Stage(null);
      stateManager.startAct3();
      setDismissedAct3(false);
    });
  }, []);
  const startAct4FromInvestigation = useCallback(() => {
    const current = stateManager.getState();
    if (current.game.flags.FLAG_A3_COMPLETE !== true || current.game.flags.FLAG_A3_SITE_EXITED !== true || current.modules.act3.stage !== 'T07') return;
    runSceneTransition(() => {
      if (current.modules.act4.stage === 'inactive') stateManager.startAct4();
      setReviewAct3(false);
      setDismissedAct3(false);
      setDismissedAct4(false);
    });
  }, []);
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
      const firstScene = act1Scenes[0];
      if (firstScene) runSceneTransition(() => stateManager.startJourney(firstScene.id));
      return;
    }
    const currentProgress = deriveInvestigationProgress(current);
    if (currentProgress.nextActionAppId) openApp(currentProgress.nextActionAppId);
  }, [openApp, startAct3FromInvestigation, startAct4FromInvestigation]);
  const { act1SceneOpen, act2SceneStage, act3Stage, act3Active, act4Active, act4Open, act3Open, act2SceneOpen, sceneOpen, desktopLabel } = view;
  const transition = getPendingStoryTransition(state);
  const transitionOpen = transition !== null && (transition.presentation === 'immediate' || openedTransitionId === transition.id);
  const continueTransition = () => {
    if (!transition) return;
    stateManager.acknowledgeStoryTransition(transition.id);
    if (transition.targetAppId) stateManager.openApp(transition.targetAppId);
    setOpenedTransitionId(null);
  };
  const transitionLayer = transition && (transitionOpen
    ? <StoryTransition transition={transition} onContinue={continueTransition} />
    : null);
  const saveImportNotice = saveImportNoticeVisible && <div role="status" aria-live="polite" style={{ position: 'fixed', zIndex: 4000, top: 'max(12px, env(safe-area-inset-top))', right: 12, width: 'min(360px, calc(100vw - 24px))', padding: '13px 16px', border: '1px solid #55745f', borderRadius: 6, color: '#263a2d', background: '#eef4ef', boxShadow: '0 8px 24px #15251f30', lineHeight: 1.5 }}>调查记录已恢复，并保存到这台设备。</div>;
  if (view.act1EndingOpen) {
    return <InvestigationProgressProvider state={state} suppressed={transitionOpen || showAct4Ending} currentContentActive onContinueInvestigation={continueInvestigation} onReviewAct3={reviewAct3FromInvestigation}><>
      <div className="act1-ending-flow" aria-hidden={transitionOpen} inert={transitionOpen}><Act1Ending />{transition && !transitionOpen && <div className="act1-ending-flow__next"><StoryTransitionLaunch transition={transition} onOpen={() => setOpenedTransitionId(transition.id)} /></div>}</div>
      <InvestigationProgressDrawer state={state} />
      {transitionLayer}
      {saveImportNotice}
    </></InvestigationProgressProvider>;
  }
  const activeWindowId = state.desktop.activeAppId;
  const activeWindowState = activeWindowId ? state.desktop.windows[activeWindowId] : null;
  const notepadWindowState = state.desktop.windows.notepad;
  const notepadWindowOpen = notepadWindowState.status === 'normal' || notepadWindowState.status === 'maximized';
  const taskCardVisible = notepadWindowOpen || !activeWindowState || activeWindowState.status === 'closed' || activeWindowState.status === 'minimized';
  const taskCardLayout = (() => {
    if (!notepadWindowOpen) return null;
    const viewportHeight = typeof window === 'undefined' ? 900 : window.innerHeight;
    const taskbarClearance = 62;
    const minimumUsefulHeight = 96;
    const preferredTop = notepadWindowState.status === 'maximized' ? 50 : Math.max(50, notepadWindowState.bounds.y + 50);
    if (viewportHeight - taskbarClearance - preferredTop >= minimumUsefulHeight) {
      return { top: preferredTop, maxHeight: `calc(100dvh - var(--desktop-task-card-top) - ${taskbarClearance}px)` };
    }
    const aboveWindowBottom = Math.max(50, Math.min(notepadWindowState.bounds.y - 8, viewportHeight - taskbarClearance));
    const aboveWindowHeight = Math.max(0, Math.min(240, aboveWindowBottom - 50));
    const top = Math.max(50, aboveWindowBottom - aboveWindowHeight);
    return {
      top,
      maxHeight: `min(${aboveWindowHeight}px, calc(${aboveWindowBottom}px - var(--desktop-task-card-top)), calc(100dvh - var(--desktop-task-card-top) - ${taskbarClearance}px))`,
    };
  })();
  const desktopStyle: CSSProperties = {
    backgroundImage: `url("${desktopWallpaperUrl}")`,
    ...(taskCardLayout ? { '--desktop-task-card-top': `${taskCardLayout.top}px` } as CSSProperties : {}),
    ...(taskCardLayout ? { '--desktop-task-card-max-height': taskCardLayout.maxHeight } as CSSProperties : {}),
  };
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
  return (
    <InvestigationProgressProvider state={state} suppressed={transitionOpen || showAct4Ending} currentContentActive={sceneOpen} onOpenApp={openProgressApp} onContinueInvestigation={continueInvestigation} onReviewAct3={reviewAct3FromInvestigation}>
    <>
    <div aria-hidden={transitionOpen || showAct4Ending} inert={transitionOpen || showAct4Ending}>
    <main className={`desktop${sceneOpen ? ' desktop--scene-hidden' : ''}${taskCardVisible ? ' desktop--task-card-visible' : ''}`} style={desktopStyle} data-asset-id="IMG_A1_A_001" aria-label={desktopLabel} aria-hidden={sceneOpen} inert={sceneOpen ? true : undefined} onClick={(event) => { const target = event.target as HTMLElement; if (target === event.currentTarget || target.classList.contains('desktop__icons')) setSelectedAppId(null); }}>
      <a className="skip-link" href="#taskbar">跳到任务栏</a>
      <h1 className="sr-only">{desktopLabel}</h1>
      <div className="desktop__icons" aria-label="桌面应用">
        {apps.map((app) => <SelectableDesktopIcon key={app.appId} app={app} onOpen={() => openApp(app.appId)} selected={selectedAppId === app.appId} onSelect={() => setSelectedAppId(app.appId)} />)}
      </div>
      {taskCardVisible && <DesktopTaskCard state={state} onOpenApp={openApp} className={notepadWindowOpen ? 'desktop-task-card--notepad-open' : undefined} />}
      {/* T07 入口只在 T06 收束后出现；必须玩家主动点击才进入。 */}
      <Act2T07Entry manager={stateManager} />
      {apps.map((app) => {
        const windowState = state.desktop.windows[app.appId];
        return windowState.status === 'closed' || windowState.status === 'minimized' ? null : (
          <AppWindow
            key={app.appId}
            app={appById[app.appId]}
            windowState={windowState}
            active={state.desktop.activeAppId === app.appId}
            onFocus={() => stateManager.focusWindow(app.appId)}
            onMinimize={() => stateManager.minimizeWindow(app.appId)}
            onToggleMaximize={() => stateManager.toggleMaximize(app.appId)}
            onClose={() => stateManager.closeWindow(app.appId)}
            onBoundsChange={(bounds) => stateManager.setBounds(app.appId, bounds)}
          />
        );
      })}
      <div id="taskbar" tabIndex={-1}><Taskbar desktop={state.desktop} onAppClick={taskbarClick} onResetProgress={() => stateManager.resetProgress()} time={time} /></div>
    </main>
    {act1SceneOpen && <SceneTransitionLayer key={state.modules.scene.journeyStarted ? state.modules.scene.currentSceneId ?? 'journey' : 'journey'}><Act1SceneExperience state={state} onSceneTransition={runSceneTransition} /></SceneTransitionLayer>}
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
    <InvestigationProgressDrawer state={state} />
    {transitionLayer}
    {saveImportNotice}
    <SaveRecoveryNotice manager={stateManager} />
    </>
    </InvestigationProgressProvider>
  );
}
