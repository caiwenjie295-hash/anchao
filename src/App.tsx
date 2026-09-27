import { useEffect, useState, useSyncExternalStore } from 'react';
import { stateManager } from './core/stateManager';
import type { Act2Stage, AppId } from './core/types';
import { apps, appById } from './data/apps';
import { AppWindow } from './components/AppWindow';
import { DesktopIcon } from './components/DesktopIcon';
import { DesktopTaskCard } from './components/DesktopTaskCard';
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
import { Act2T07Entry } from './scenes/act2/T07Investigation';
import { StoryTransition, StoryTransitionLaunch } from './components/StoryTransition';
import { getPendingStoryTransition } from './data/storyTransitionData';
import './styles.css';
import './imageAssets.css';

type Act2SceneStage = Extract<Act2Stage, 'bridge' | 'library' | 'tales' | 'school' | 'finale'>;

/** 只有 bridge / library / tales / school / finale 会接管全屏场景；search 与 T06 仍是普通桌面。 */
const isAct2SceneStage = (stage: Act2Stage): stage is Act2SceneStage => stage === 'bridge' || stage === 'library' || stage === 'tales' || stage === 'school' || stage === 'finale';

export default function App() {
  const state = useSyncExternalStore(stateManager.subscribe, stateManager.getState, stateManager.getState);
  const [time, setTime] = useState(() => new Date());
  // “已返回桌面”只是瞬时显示状态；阶段一变或清零即刻失效。
  const [dismissedAct2Stage, setDismissedAct2Stage] = useState<Act2SceneStage | null>(null);
  const [dismissedAct3, setDismissedAct3] = useState(false);
  const [openedTransitionId, setOpenedTransitionId] = useState<string | null>(null);
  useEffect(() => {
    const interval = window.setInterval(() => setTime(new Date()), 15_000);
    return () => window.clearInterval(interval);
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

  // 清零或离开第二幕场景阶段时，丢弃旧的“已返回桌面”标记，避免污染下一次游玩。
  useEffect(() => {
    if (!isAct2SceneStage(act2Stage)) setDismissedAct2Stage(null);
  }, [act2Stage]);

  const openApp = (appId: AppId) => stateManager.openApp(appId);
  const taskbarClick = (appId: AppId) => stateManager.toggleTaskbarApp(appId);
  const act1SceneOpen = (state.game.phase === 'F' && !state.modules.scene.journeyStarted) || state.modules.scene.currentSceneId !== null;
  const act2SceneStage = isAct2SceneStage(act2Stage) ? act2Stage : null;
  const act3Stage = state.modules.act3.stage;
  const act3Active = act3Stage !== 'inactive';
  const act3Open = act3Active && !dismissedAct3;
  const act2SceneOpen = act2SceneStage !== null && !act3Active && dismissedAct2Stage !== act2SceneStage;
  const sceneOpen = act1SceneOpen || act2SceneOpen || act3Open;
  const secondActStarted = act2Stage !== 'inactive';
  const desktopLabel = secondActStarted ? '暗潮私人桌面' : '暗潮第一幕私人桌面';
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
    : <StoryTransitionLaunch transition={transition} onOpen={() => setOpenedTransitionId(transition.id)} />);
  if (state.game.flags.FLAG_A1_COMPLETE === true && !secondActStarted) {
    return <>
      <div aria-hidden={transitionOpen} inert={transitionOpen}><Act1Ending /></div>
      {transitionLayer}
    </>;
  }
  return (
    <>
    <div aria-hidden={transitionOpen} inert={transitionOpen}>
    <main className={`desktop${sceneOpen ? ' desktop--scene-hidden' : ''}`} data-asset-id="IMG_A1_A_001" aria-label={desktopLabel} aria-hidden={sceneOpen} inert={sceneOpen ? true : undefined}>
      <a className="skip-link" href="#taskbar">跳到任务栏</a>
      <h1 className="sr-only">{desktopLabel}</h1>
      <div className="desktop__icons" aria-label="桌面应用">
        {apps.map((app) => <DesktopIcon key={app.appId} app={app} onOpen={() => openApp(app.appId)} />)}
      </div>
      <DesktopTaskCard state={state} onOpenApp={openApp} />
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
      <div id="taskbar"><Taskbar desktop={state.desktop} onAppClick={taskbarClick} onResetProgress={() => stateManager.resetProgress()} time={time} /></div>
    </main>
    {act1SceneOpen && <Act1SceneExperience state={state} />}
    {act2SceneStage !== null && !act3Active && (
      <Act2Experience
        stage={act2SceneStage}
        sceneOpen={act2SceneOpen}
        onDismissScene={() => setDismissedAct2Stage(act2SceneStage)}
        onResumeScene={() => setDismissedAct2Stage(null)}
        manager={stateManager}
      />
    )}
    {!act3Active && state.game.flags.FLAG_A2_COMPLETE === true && (
      <aside className="story-transition-launch" aria-label="第三幕调查已就绪">
        <span>第三幕 · 再次进山</span>
        <button type="button" onClick={() => { stateManager.startAct3(); setDismissedAct3(false); }}>开始第三幕调查</button>
      </aside>
    )}
    {act3Active && (
      <>
        {act3Open && (
          <Act3Investigation
            manager={stateManager}
            onReturnToDesktop={() => setDismissedAct3(true)}
          />
        )}
        {dismissedAct3 && (
          <aside className="story-transition-launch" aria-label="第三幕调查已就绪">
            <span>第三幕 · {act3Stage === 'T00' ? '再次进山' : act3Stage === 'T01' ? '启明旧址入口' : '教室与标语'}</span>
            <button type="button" onClick={() => setDismissedAct3(false)}>继续启明遗址调查</button>
          </aside>
        )}
      </>
    )}
    </div>
    {transitionLayer}
    </>
  );
}
