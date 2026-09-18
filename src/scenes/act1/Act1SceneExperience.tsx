import { useState } from 'react';
import { assetLoader } from '../../core/assetLoader';
import { EvidenceImage } from '../../components/EvidenceImage';
import { stateManager } from '../../core/stateManager';
import type { AppState } from '../../core/types';
import { act1Scenes, hotspotsBySceneId, sceneById, type SceneHotspot, type SceneRecord } from '../../data/sceneData';
import { SceneClueFocus } from './SceneClueFocus';

const startScene = act1Scenes[0];

function SceneTransition() {
  return (
    <section className="journey-transition" aria-label="前往鸡公岭">
      <div className="journey-transition__copy">
        <p>{startScene.journeyIntro}</p>
        <button type="button" autoFocus onClick={() => stateManager.startJourney(startScene.id)}>继续</button>
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

function SceneView({ state, scene }: { state: AppState; scene: SceneRecord }) {
  const [activeHotspot, setActiveHotspot] = useState<SceneHotspot | null>(null);
  const hotspots = hotspotsBySceneId.get(scene.id) ?? [];
  const background = assetLoader.get(scene.backgroundAssetId)?.src;
  const flags = state.game.flags;
  const photoCaptured = scene.capturePhotoId !== null && state.modules.scene.capturedPhotoIds.includes(scene.capturePhotoId);
  const triggerFlags = [...new Set(hotspots.flatMap((hotspot) => hotspot.triggerFlags))];
  const canCapture = scene.capturePhotoId !== null && triggerFlags.every((flagId) => flags[flagId] === true) && !photoCaptured;
  const canLeave = scene.requiredFlagIds.every((flagId) => flags[flagId] === true);
  const next = scene.nextSceneId ? sceneById.get(scene.nextSceneId) : null;
  const inspect = (hotspot: SceneHotspot) => {
    stateManager.inspectSceneHotspot(hotspot.id);
    setActiveHotspot(hotspot);
  };
  const leave = () => {
    if (!canLeave) return;
    if (next) stateManager.enterScene(next.id);
    else stateManager.finishJourney(scene.id);
  };
  return (
    <section className="act1-scene" aria-label={`${scene.title}场景`}>
      <header className="act1-scene__header">
        <div><p className="act1-scene__eyebrow">鸡公岭</p><h1>{scene.title}</h1></div>
        <p className="act1-scene__progress" aria-label={`当前位置：${scene.title}`}>{act1Scenes.findIndex((item) => item.id === scene.id) + 1} / {act1Scenes.length}</p>
      </header>
      <div className={`act1-scene__canvas act1-scene__canvas--${scene.visualVariant}${background ? ' act1-scene__canvas--image' : ''}`} data-asset-id={scene.backgroundAssetId}>
        {background ? <div className="scene-image-frame">
          <img className="scene-background" src={background} alt={scene.title} />
          {hotspots.map((hotspot) => <Hotspot key={hotspot.id} hotspot={hotspot} onInspect={inspect} />)}
        </div> : <><div className="act1-scene__atmosphere" aria-hidden="true" />{hotspots.map((hotspot) => <Hotspot key={hotspot.id} hotspot={hotspot} onInspect={inspect} />)}</>}
        <p className="act1-scene__instruction">在图片中寻找线索，点击获取线索</p>
      </div>
      <aside className="act1-scene__detail" aria-live="polite">
        <div>{activeHotspot ? <><h2>{activeHotspot.label}</h2><p>{activeHotspot.observation}</p></> : <><h2>停一停</h2><p>{scene.description}</p></>}</div>
        {activeHotspot?.imageAssetId && assetLoader.isAvailable(activeHotspot.imageAssetId) && <EvidenceImage assetId={activeHotspot.imageAssetId} caption={activeHotspot.label} />}
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
        backgroundSrc={background}
        onClose={() => setActiveHotspot(null)}
      />}
    </section>
  );
}

export function Act1SceneExperience({ state }: { state: AppState }) {
  if (state.game.phase === 'F' && !state.modules.scene.journeyStarted) return <SceneTransition />;
  const currentId = state.modules.scene.currentSceneId;
  const scene = currentId ? sceneById.get(currentId) : null;
  return scene ? <SceneView key={scene.id} state={state} scene={scene} /> : null;
}
