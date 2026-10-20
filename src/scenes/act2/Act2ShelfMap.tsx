import { useEffect, useRef, useState } from 'react';
import {
  ACT2_LIBRARY_SHELF_IMAGE_SIZE,
  normalizedRectToPercentStyle,
  type NormalizedImageRect,
} from '../../data/act2Presentation';
import '../../act2/act2ShelfMap.css';

export interface Act2ShelfMapEntry {
  id: string;
  label: string;
  rect: NormalizedImageRect;
}

export interface Act2ShelfMapProps {
  assetId: string;
  source?: string;
  imageAlt: string;
  label: string;
  entries: Act2ShelfMapEntry[];
  selectedId?: string | null;
  disabled?: boolean;
  lockedHint?: string;
  onSelect: (id: string) => void;
}

type ImageState = { key: string; status: 'loading' | 'loaded' | 'failed'; width: number; height: number };

/** Click targets are positioned on a plane with the source image's full natural aspect ratio. */
export function Act2ShelfMap({
  assetId,
  source = '',
  imageAlt,
  label,
  entries,
  selectedId = null,
  disabled = false,
  lockedHint = '先缩小目录范围，再选择书架上的卷册。',
  onSelect,
}: Act2ShelfMapProps) {
  const resourceKey = `${assetId}\u0000${source}`;
  const latestResourceKey = useRef(resourceKey);
  latestResourceKey.current = resourceKey;
  const [imageState, setImageState] = useState<ImageState>({ key: '', status: 'loading', width: 0, height: 0 });
  const imageLoaded = imageState.key === resourceKey && imageState.status === 'loaded';
  const imageFailed = !source || (imageState.key === resourceKey && imageState.status === 'failed');
  const imageSize = imageLoaded
    ? { width: imageState.width, height: imageState.height }
    : ACT2_LIBRARY_SHELF_IMAGE_SIZE;

  useEffect(() => {
    setImageState({ key: resourceKey, status: source ? 'loading' : 'failed', width: 0, height: 0 });
  }, [resourceKey, source]);

  const selectEntry = (id: string) => {
    if (!disabled) onSelect(id);
  };

  return (
    <section className="act2-shelf-map" aria-label={label} data-asset-id={assetId} data-image-status={imageFailed ? 'failed' : imageLoaded ? 'loaded' : 'loading'}>
      <div className="act2-shelf-map__plane" style={{ aspectRatio: `${imageSize.width} / ${imageSize.height}` }}>
        {source ? <img
          key={resourceKey}
          src={source}
          alt={imageLoaded ? imageAlt : ''}
          aria-hidden={!imageLoaded}
          data-resource-key={resourceKey}
          onLoad={(event) => {
            const image = event.currentTarget;
            if (latestResourceKey.current !== resourceKey || image.dataset.resourceKey !== resourceKey || image.naturalWidth <= 0 || image.naturalHeight <= 0) return;
            setImageState({ key: resourceKey, status: 'loaded', width: image.naturalWidth, height: image.naturalHeight });
          }}
          onError={(event) => {
            if (latestResourceKey.current === resourceKey && event.currentTarget.dataset.resourceKey === resourceKey) {
              setImageState({ key: resourceKey, status: 'failed', width: 0, height: 0 });
            }
          }}
        /> : null}
        {!imageLoaded && <div className="act2-shelf-map__fallback" role="img" aria-label={imageAlt}>
          <span aria-hidden="true">{imageFailed ? '!' : '…'}</span>
          <p>{imageFailed ? '书架照片暂时无法显示；可以使用下方的文字入口继续。' : '正在载入书架照片…'}</p>
        </div>}
        {imageLoaded && <div className="act2-shelf-map__hotspots" role="group" aria-label="照片上的书架入口">
          {entries.map((entry, index) => <button
            key={entry.id}
            type="button"
            className={`act2-shelf-map__hotspot${disabled ? ' act2-shelf-map__hotspot--caption' : ''}${!disabled && selectedId === entry.id ? ' is-selected' : ''}`}
            style={normalizedRectToPercentStyle(entry.rect)}
            aria-label={disabled ? `书架第 ${index + 1} 区域。${lockedHint}` : entry.label}
            aria-pressed={!disabled && selectedId === entry.id}
            disabled={disabled}
            onClick={() => selectEntry(entry.id)}
          ><span>{disabled ? '待查阅' : entry.label}</span></button>)}
        </div>}
      </div>
      {disabled && <p className="act2-shelf-map__locked" role="note">{lockedHint}</p>}
      <nav className="act2-shelf-map__text-links" aria-label={`${label}文字入口`}>
        <p>{imageFailed ? '图片替代入口' : '也可从文字入口选择'}</p>
        <ul>{entries.map((entry, index) => <li key={entry.id}>
          <button type="button" data-shelf-entry-id={entry.id} aria-current={selectedId === entry.id ? 'true' : undefined} disabled={disabled} onClick={() => selectEntry(entry.id)}>
            {disabled ? `书架第 ${index + 1} 区域` : entry.label}
          </button>
        </li>)}</ul>
      </nav>
    </section>
  );
}

export default Act2ShelfMap;
