import { useState } from 'react';
import { assetLoader } from '../../core/assetLoader';
import { useInvestigationProgress } from '../../components/InvestigationProgressContext';
import { stateManager } from '../../core/stateManager';
import type { AppState } from '../../core/types';
import { act1Scenes, hotspotsBySceneId, sceneById, type SceneHotspot, type SceneRecord } from '../../data/sceneData';
import { SceneClueFocus } from './SceneClueFocus';
import { useCurtainExit } from '../../components/scenePolish/useCurtainExit';

const startScene = act1Scenes[0];

type SceneTransitionRunner = (action: () => void) => void;

function SceneTransition({ onSceneTransition, onCancelJourneyIntro }: { onSceneTransition?: SceneTransitionRunner; onCancelJourneyIntro?: () => void }) {
  const progressContext = useInvestigationProgress();
  const { closing, beginExit } = useCurtainExit(() => (onSceneTransition ?? ((action) => action()))(() => stateManager.startJourney(startScene.id)), 520);
  return (
    <section className={`journey-transition scene-polish-curtain${closing ? ' journey-transition--closing scene-polish-curtain--closing' : ''}`} style={closing ? { animationDuration: '520ms' } : undefined} aria-label="前往鸡公岭">
      {progressContext && <button type="button" className="investigation-progress-trigger journey-transition__progress-trigger" aria-label="打开调查进度" onClick={(event) => progressContext.openProgress(event.currentTarget)}>调查进度</button>}
      <div className="journey-transition__copy">
        <p>{startScene.journeyIntro}</p>
        <button type="button" autoFocus disabled={closing} onClick={() => beginExit()}>前往鸡公岭</button>
        {onCancelJourneyIntro && <button type="button" className="journey-transition__cancel" disabled={closing} onClick={onCancelJourneyIntro}>暂不出发，返回资料</button>}
      </div>
    </section>
  );
}

function Hotspot({ hotspot, onInspect }: { hotspot: SceneHotspot; onInspect: (hotspot: SceneHotspot) => void }) {
  const { x, y, width, height } = hotspot.position;
  return (
    <button
      type="button"
      className={`scene-hotspot scene-hotspot--${hotspot.hotspotKind}`}
      style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%` }}
      aria-label={`查看${hotspot.label}`}
      onClick={() => onInspect(hotspot)}
    >
      {hotspot.hotspotKind === 'graffiti' || hotspot.hotspotKind === 'aw-mark'
        ? <span className="scene-hotspot__mark" aria-hidden="true">{hotspot.label}</span>
        : <span className="sr-only">{hotspot.label}</span>}
    </button>
  );
}

function SceneView({ state, scene, onSceneTransition, onReturnToDesktop }: { state: AppState; scene: SceneRecord; onSceneTransition?: SceneTransitionRunner; onReturnToDesktop?: () => void }) {
  const progressContext = useInvestigationProgress();
  const [activeHotspot, setActiveHotspot] = useState<SceneHotspot | null>(null);
  const [backgroundFailed, setBackgroundFailed] = useState(false);
  const [backgroundRetry, setBackgroundRetry] = useState(0);
  const hotspots = hotspotsBySceneId.get(scene.id) ?? [];
  const background = assetLoader.get(scene.backgroundAssetId)?.src;
  const visibleBackground = background && !backgroundFailed;
  const flags = state.game.flags;
  const photoCaptured = scene.capturePhotoId !== null && state.modules.scene.capturedPhotoIds.includes(scene.capturePhotoId);
  const triggerFlags = [...new Set(hotspots.flatMap((hotspot) => hotspot.triggerFlags))];
  const canCapture = scene.capturePhotoId !== null && triggerFlags.every((flagId) => flags[flagId] === true) && !photoCaptured;
  const canLeave = scene.requiredFlagIds.every((flagId) => flags[flagId] === true);
  const next = scene.nextSceneId ? sceneById.get(scene.nextSceneId) : null;
  const { closing, beginExit } = useCurtainExit(() => (onSceneTransition ?? ((action) => action()))(() => {
    if (next) stateManager.enterScene(next.id);
    else stateManager.finishJourney(scene.id);
  }));
  const inspect = (hotspot: SceneHotspot) => {
    stateManager.inspectSceneHotspot(hotspot.id);
    setActiveHotspot(hotspot);
  };
  const leave = () => {
    if (canLeave) beginExit();
  };
  return (
    <section className={`act1-scene${closing ? ' act1-scene--closing scene-polish-curtain--closing' : ''}`} aria-label={`${scene.title}场景`}>
      <header className="act1-scene__header">
        <div><p className="act1-scene__eyebrow">鸡公岭</p><h1>{scene.title}</h1></div>
      <div className="act1-scene__header-actions">
          <p className="act1-scene__progress" aria-label={`当前位置：${scene.title}`}>{act1Scenes.findIndex((item) => item.id === scene.id) + 1} / {act1Scenes.length}</p>
        {onReturnToDesktop && <button type="button" className="act1-scene__return" aria-label="返回桌面，稍后继续现场调查" onClick={() => beginExit(onReturnToDesktop)}>返回桌面</button>}
          {progressContext && <button type="button" className="investigation-progress-trigger act1-scene__progress-trigger" aria-label="打开调查进度" onClick={(event) => progressContext.openProgress(event.currentTarget)}>调查进度</button>}
        </div>
      </header>
      <div className={`act1-scene__canvas act1-scene__canvas--${scene.visualVariant}${visibleBackground ? ' act1-scene__canvas--image' : ''}`} data-asset-id={scene.backgroundAssetId}>
        {visibleBackground ? <div className="scene-image-frame">
          <img key={`${scene.backgroundAssetId}-${backgroundRetry}`} className="scene-background" src={`${background}${backgroundRetry ? `${background.includes('?') ? '&' : '?'}retry=${backgroundRetry}` : ''}`} alt={scene.title} onError={() => setBackgroundFailed(true)} />
          {hotspots.map((hotspot) => <Hotspot key={hotspot.id} hotspot={hotspot} onInspect={inspect} />)}
        </div> : <><div className="act1-scene__atmosphere" aria-hidden="true" />
          <div className="scene-image-fallback"><p role="status">{background ? '场景照片暂时无法显示。你仍可查看场景说明，也可以从下方打开观察记录。' : '场景照片暂不可用。你仍可查看场景说明，也可以从下方打开观察记录。'}</p>{background && <button type="button" onClick={() => { setBackgroundFailed(false); setBackgroundRetry((attempt) => attempt + 1); }}>重试加载照片</button>}
            <div className="scene-image-fallback__hotspots" role="group" aria-label="场景观察位置">{hotspots.map((hotspot, index) => <button key={hotspot.id} type="button" aria-label={`查看第 ${index + 1} 处观察位置`} onClick={() => inspect(hotspot)}>观察位置 {index + 1}</button>)}</div>
          </div>
        </>}
        <p className="act1-scene__instruction">在图片中寻找线索，点击获取线索</p>
      </div>
      <aside className="act1-scene__detail" aria-live="polite">
        <div>{activeHotspot ? <><h2>已观察</h2><p>“{activeHotspot.label}”的观察记录已打开；已知线索可再次点击回看。</p></> : <><h2>场景记录</h2><p>{scene.description}</p></>}</div>
      </aside>
      <footer className="act1-scene__footer">
        <p>{scene.ambience}</p>
        <div className="act1-scene__actions">
          {scene.capturePhotoId !== null && <button type="button" className="scene-camera" disabled={!canCapture} onClick={() => stateManager.captureScenePhoto(scene.id, scene.capturePhotoId!)}>{photoCaptured ? '照片已保存' : '拍一张'}</button>}
          <button type="button" className="scene-continue" disabled={!canLeave} onClick={leave}>{scene.continueLabel}</button>
          {!canLeave && scene.blockedObservation && <span className="scene-continue__hint">{scene.blockedObservation}</span>}
        </div>
      </footer>
      {activeHotspot && <SceneClueFocus
        hotspot={activeHotspot}
        imageSrc={activeHotspot.imageAssetId && assetLoader.isAvailable(activeHotspot.imageAssetId) ? assetLoader.get(activeHotspot.imageAssetId)?.src : undefined}
        backgroundSrc={visibleBackground ? background : undefined}
        onClose={() => setActiveHotspot(null)}
      />}
    </section>
  );
}

export function Act1SceneExperience({ state, onSceneTransition, onReturnToDesktop, onCancelJourneyIntro }: { state: AppState; onSceneTransition?: SceneTransitionRunner; onReturnToDesktop?: () => void; onCancelJourneyIntro?: () => void }) {
  if (state.game.phase === 'F' && !state.modules.scene.journeyStarted) return <SceneTransition onSceneTransition={onSceneTransition} onCancelJourneyIntro={onCancelJourneyIntro} />;
  const currentId = state.modules.scene.currentSceneId;
  const scene = currentId ? sceneById.get(currentId) : null;
  return scene ? <SceneView key={scene.id} state={state} scene={scene} onSceneTransition={onSceneTransition} onReturnToDesktop={onReturnToDesktop} /> : null;
}
