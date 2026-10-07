import { useState } from 'react';
import { stateManager, type StateManager } from '../../core/stateManager';
import { useAppSelector } from '../../core/hooks/useAppSelector';
import { selectPhotos } from '../../core/store/selectors';
import { photoById, isSymbolVisible } from '../../data/photoData';
import { assetLoader } from '../../core/assetLoader';
import { DoubleSSymbol } from '../../components/DoubleSSymbol';

const defaults = { exposure: 0, shadows: 0, contrast: 0 };

export function PhotosApp({ manager = stateManager }: { manager?: StateManager }) {
  const photosState = useAppSelector(manager, selectPhotos);
  const [failedPhotoId, setFailedPhotoId] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const photoId = photosState.activePhotoId;
  const photo = photoId ? photoById.get(photoId) : undefined;
  if (!photo || !photoId) return <section className="photos-app photos-app--empty" aria-label="照片"><p>从资源管理器打开一张照片。</p></section>;
  const adjustment = photosState.adjustments[photoId] ?? defaults;
  const zoom = photosState.zoomByPhotoId[photoId] ?? 1;
  const cave = photoId === 'IMG_A1_H_003';
  const revealed = cave && isSymbolVisible(adjustment);
  const inspected = photosState.inspectedSymbolPhotoIds.includes(photoId);
  const imageSrc = assetLoader.get(photoId)?.src;
  const imageFailed = !imageSrc || failedPhotoId === photoId;
  const restoreOriginal = () => {
    manager.setPhotoAdjustment(photoId, 'exposure', defaults.exposure);
    manager.setPhotoAdjustment(photoId, 'shadows', defaults.shadows);
    manager.setPhotoAdjustment(photoId, 'contrast', defaults.contrast);
    manager.setPhotoZoom(photoId, 1);
  };
  return <section className="photos-app" aria-label="照片查看器">
    <header><div><span>照片</span><h2>{photo.filename}</h2></div><p>{photo.caption}</p></header>
    <div className="photo-stage">
      <div className="photo-scroll"><div className="photo-zoom" style={{ width: `calc(min(100cqw, 100cqh * 4 / 3) * ${zoom})` }}>
        <div className={`evidence-photo evidence-photo--${cave ? 'cave' : 'temple'}`} data-asset-id={photoId} style={{ filter: `brightness(${1 + adjustment.exposure / 170}) contrast(${1 + adjustment.contrast / 150})` }}>
          {!imageFailed && <img key={`${photoId}-${retryKey}`} className="photo-evidence-image" src={imageSrc} alt={photo.title} onError={() => setFailedPhotoId(photoId)} />}
          {!imageFailed && <div className="photo-shadow" style={{ opacity: Math.max(.05, .78 - adjustment.shadows / 135) }} />}
          {!imageFailed && revealed && <button type="button" className={`double-s${inspected ? ' double-s--inspected' : ''}`} onClick={() => manager.inspectPhotoSymbol(photoId)} aria-label="检查暗处的双 S 十字符号">
            <DoubleSSymbol label="暗处的双 S 十字符号" />
          </button>}
        </div>
      </div>{imageFailed && <div className="photo-image-fallback" role="status"><p>{imageSrc ? '照片暂时无法显示，调查记录和调节状态仍已保留。' : '照片资源暂不可用，调查记录和调节状态仍已保留。'}</p>{imageSrc && <button type="button" onClick={() => { setFailedPhotoId(null); setRetryKey((current) => current + 1); }}>重试加载</button>}</div>}</div>
      <div className="photo-zoom-controls">
        <button type="button" aria-label="缩小照片" onClick={() => manager.setPhotoZoom(photoId, zoom - .1)} disabled={zoom <= 1}>−</button>
        <output>{Math.round(zoom * 100)}%</output>
        <button type="button" aria-label="放大照片" onClick={() => manager.setPhotoZoom(photoId, zoom + .1)} disabled={zoom >= 2.5}>＋</button>
      </div>
    </div>
    <section className="photo-controls" aria-label="编辑照片">
      <div className="photo-controls__heading"><h3>调整</h3><button type="button" onClick={restoreOriginal} disabled={adjustment.exposure === 0 && adjustment.shadows === 0 && adjustment.contrast === 0 && zoom === 1}>恢复原图</button></div>
      {(['exposure', 'shadows', 'contrast'] as const).map((key) => <label key={key}>
        {key === 'exposure' ? '曝光' : key === 'shadows' ? '阴影' : '对比度'}
        <input aria-label={key === 'exposure' ? '曝光' : key === 'shadows' ? '阴影' : '对比度'} type="range" min="-100" max="100" value={adjustment[key]} onChange={(event) => manager.setPhotoAdjustment(photoId, key, Number(event.target.value))} />
        <output>{adjustment[key] > 0 ? '+' : ''}{adjustment[key]}</output>
      </label>)}
      <p role="status">{revealed ? inspected ? photo.findingText : photo.symbolLabel : photo.editorHint}</p>
    </section>
    {inspected && <footer className="photo-discovery"><span>已记入调查记录</span><button type="button" onClick={() => manager.openApp('notepad')}>查看调查记录</button><button type="button" onClick={() => manager.finishFirstAct()}>整理思绪，继续</button></footer>}
  </section>;
}
