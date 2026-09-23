import { useSyncExternalStore } from 'react';
import { stateManager, type StateManager } from '../../core/stateManager';
import { photoById, isSymbolVisible } from '../../data/photoData';
import { assetLoader } from '../../core/assetLoader';
import { DoubleSSymbol } from '../../components/DoubleSSymbol';

const defaults = { exposure: 0, shadows: 0, contrast: 0 };

export function PhotosApp({ manager = stateManager }: { manager?: StateManager }) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const photoId = state.modules.photos.activePhotoId;
  const photo = photoId ? photoById.get(photoId) : undefined;
  if (!photo || !photoId) return <section className="photos-app photos-app--empty" aria-label="照片"><p>从资源管理器打开一张照片。</p></section>;
  const adjustment = state.modules.photos.adjustments[photoId] ?? defaults;
  const zoom = state.modules.photos.zoomByPhotoId[photoId] ?? 1;
  const cave = photoId === 'IMG_A1_H_003';
  const revealed = cave && isSymbolVisible(adjustment);
  const inspected = state.modules.photos.inspectedSymbolPhotoIds.includes(photoId);
  return <section className="photos-app" aria-label="照片查看器">
    <header><div><span>照片</span><h2>{photo.filename}</h2></div><p>{photo.caption}</p></header>
    <div className="photo-stage">
      <div className="photo-scroll"><div className="photo-zoom" style={{ width: `calc(min(100cqw, 100cqh * 4 / 3) * ${zoom})` }}>
        <div className={`evidence-photo evidence-photo--${cave ? 'cave' : 'temple'}`} data-asset-id={photoId} style={{ filter: `brightness(${1 + adjustment.exposure / 170}) contrast(${1 + adjustment.contrast / 150})` }}>
          <img className="photo-evidence-image" src={assetLoader.get(photoId)!.src} alt={photo.title} />
          <div className="photo-shadow" style={{ opacity: Math.max(.05, .78 - adjustment.shadows / 135) }} />
          {revealed && <button type="button" className={`double-s${inspected ? ' double-s--inspected' : ''}`} onClick={() => manager.inspectPhotoSymbol(photoId)} aria-label="检查暗处的双 S 十字符号">
            <DoubleSSymbol label="暗处的双 S 十字符号" />
          </button>}
        </div>
      </div></div>
      <div className="photo-zoom-controls">
        <button type="button" aria-label="缩小照片" onClick={() => manager.setPhotoZoom(photoId, zoom - .1)} disabled={zoom <= 1}>−</button>
        <output>{Math.round(zoom * 100)}%</output>
        <button type="button" aria-label="放大照片" onClick={() => manager.setPhotoZoom(photoId, zoom + .1)} disabled={zoom >= 2.5}>＋</button>
      </div>
    </div>
    <section className="photo-controls" aria-label="编辑照片">
      <h3>编辑</h3>
      {(['exposure', 'shadows', 'contrast'] as const).map((key) => <label key={key}>
        {key === 'exposure' ? '曝光' : key === 'shadows' ? '阴影' : '对比度'}
        <input aria-label={key === 'exposure' ? '曝光' : key === 'shadows' ? '阴影' : '对比度'} type="range" min="-100" max="100" value={adjustment[key]} onChange={(event) => manager.setPhotoAdjustment(photoId, key, Number(event.target.value))} />
        <output>{adjustment[key] > 0 ? '+' : ''}{adjustment[key]}</output>
      </label>)}
      <p>{revealed ? inspected ? photo.findingText : photo.symbolLabel : photo.editorHint}</p>
    </section>
    {inspected && <footer className="photo-discovery"><span>已记入记事本</span><button type="button" onClick={() => manager.openApp('notepad')}>查看记录</button><button type="button" onClick={() => manager.finishFirstAct()}>整理思绪，继续</button></footer>}
  </section>;
}
