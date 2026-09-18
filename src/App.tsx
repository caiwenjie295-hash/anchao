import { useEffect, useState, useSyncExternalStore } from 'react';
import { stateManager } from './core/stateManager';
import type { AppId } from './core/types';
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
import { Act1SceneExperience } from './scenes/act1/Act1SceneExperience';
import { Act1Ending } from './scenes/act1/Act1Ending';
import './styles.css';
import './imageAssets.css';

export default function App() {
  const state = useSyncExternalStore(stateManager.subscribe, stateManager.getState, stateManager.getState);
  const [time, setTime] = useState(() => new Date());
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
    phaseBController.start();
    phaseCController.start();
    phaseEFController.start();
    phaseGHIController.start();
    phaseJKController.start();
    return () => {
      phaseJKController.dispose();
      phaseGHIController.dispose();
      phaseEFController.dispose();
      phaseCController.dispose();
      phaseBController.dispose();
    };
  }, []);
  const openApp = (appId: AppId) => stateManager.openApp(appId);
  const taskbarClick = (appId: AppId) => stateManager.toggleTaskbarApp(appId);
  const sceneOpen = (state.game.phase === 'F' && !state.modules.scene.journeyStarted) || state.modules.scene.currentSceneId !== null;
  const secondActStarted = state.modules.act2Research.stage !== 'inactive';
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
    {sceneOpen && <Act1SceneExperience state={state} />}
    </>
  );
}
