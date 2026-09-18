import { useEffect, useState, useSyncExternalStore } from 'react';
import { stateManager } from './core/stateManager';
import type { Act2ActiveStage, Act2Stage, AppId } from './core/types';
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
import { Act1SceneExperience } from './scenes/act1/Act1SceneExperience';
import { Act1Ending } from './scenes/act1/Act1Ending';
import { Act2Experience } from './scenes/act2/Act2Experience';
import './styles.css';
import './imageAssets.css';

type Act2SceneStage = Exclude<Act2ActiveStage, 'search'>;

/** 只有 bridge / library 会接管全屏场景；search 仍是普通桌面。 */
const isAct2SceneStage = (stage: Act2Stage): stage is Act2SceneStage => stage === 'bridge' || stage === 'library';

export default function App() {
  const state = useSyncExternalStore(stateManager.subscribe, stateManager.getState, stateManager.getState);
  const [time, setTime] = useState(() => new Date());
  // “已返回桌面”只是瞬时显示状态；阶段一变或清零即刻失效。
  const [dismissedAct2Stage, setDismissedAct2Stage] = useState<Act2SceneStage | null>(null);
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
    phaseBController.start();
    phaseCController.start();
    phaseEFController.start();
    phaseGHIController.start();
    phaseJKController.start();
    act2T01Controller.start();
    return () => {
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
  const act2SceneOpen = act2SceneStage !== null && dismissedAct2Stage !== act2SceneStage;
  const sceneOpen = act1SceneOpen || act2SceneOpen;
  const secondActStarted = act2Stage !== 'inactive';
  const desktopLabel = secondActStarted ? '暗潮私人桌面' : '暗潮第一幕私人桌面';
  if (state.game.flags.FLAG_A1_COMPLETE === true && !secondActStarted) return <Act1Ending />;
  return (
    <>
    <main className={`desktop${sceneOpen ? ' desktop--scene-hidden' : ''}`} data-asset-id="IMG_A1_A_001" aria-label={desktopLabel} aria-hidden={sceneOpen} inert={sceneOpen ? true : undefined}>
      <a className="skip-link" href="#taskbar">跳到任务栏</a>
      <h1 className="sr-only">{desktopLabel}</h1>
      <div className="desktop__icons" aria-label="桌面应用">
        {apps.map((app) => <DesktopIcon key={app.appId} app={app} onOpen={() => openApp(app.appId)} />)}
      </div>
      <DesktopTaskCard state={state} onOpenApp={openApp} />
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
    {act2SceneStage !== null && (
      <Act2Experience
        stage={act2SceneStage}
        sceneOpen={act2SceneOpen}
        onDismissScene={() => setDismissedAct2Stage(act2SceneStage)}
        onResumeScene={() => setDismissedAct2Stage(null)}
        manager={stateManager}
      />
    )}
    </>
  );
}
