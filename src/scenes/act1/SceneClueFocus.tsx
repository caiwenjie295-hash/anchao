import { useEffect, useRef, useState } from 'react';
import type { SceneHotspot } from '../../data/sceneData';
import { useCurtainExit } from '../../components/scenePolish/useCurtainExit';

export interface SceneClueFocusProps {
  hotspot: SceneHotspot;
  imageSrc?: string;
  backgroundSrc?: string;
  onClose: () => void;
}

/** A transient, non-persisted close-up for a scene observation. */
export function SceneClueFocus({ hotspot, imageSrc, backgroundSrc, onClose }: SceneClueFocusProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const [imageFailed, setImageFailed] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const { closing, beginExit } = useCurtainExit(() => onCloseRef.current());
  onCloseRef.current = onClose;
  const titleId = `scene-clue-focus-${hotspot.id}`;
  const descriptionId = `${titleId}-description`;
  const focusX = hotspot.position.x + hotspot.position.width / 2;
  const focusY = hotspot.position.y + hotspot.position.height / 2;
  const isIndependentImage = Boolean(imageSrc);
  const activeImageSrc = isIndependentImage ? imageSrc : backgroundSrc;
  const imageUrl = activeImageSrc && retryAttempt > 0
    ? `${activeImageSrc}${activeImageSrc.includes('?') ? '&' : '?'}retry=${retryAttempt}`
    : activeImageSrc;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        beginExit();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? []);
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panelRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panelRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [beginExit, hotspot.id]);

  useEffect(() => {
    setImageFailed(false);
    setRetryAttempt(0);
  }, [imageSrc, backgroundSrc]);

  return (
    <div
      className={`scene-clue-focus${closing ? ' scene-clue-focus--closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={(event) => { if (event.target === event.currentTarget) beginExit(); }}
    >
      <section ref={panelRef} className="scene-clue-focus__panel" tabIndex={-1}>
        <header className="scene-clue-focus__header">
          <h2 id={titleId}>{hotspot.label}</h2>
          <button ref={closeButtonRef} type="button" aria-disabled={closing} onClick={() => beginExit()}>关闭特写</button>
        </header>
        {imageUrl && !imageFailed && isIndependentImage ? (
          <figure className="scene-clue-focus__image scene-clue-focus__image--independent">
            <img key={`${hotspot.id}-${retryAttempt}`} src={imageUrl} alt={hotspot.label} data-asset-id={hotspot.imageAssetId} onError={() => setImageFailed(true)} />
          </figure>
        ) : imageUrl && !imageFailed && backgroundSrc ? (
          <figure className="scene-clue-focus__image scene-clue-focus__image--background" aria-label={`${hotspot.label}的局部放大`}>
            <img
              key={`${hotspot.id}-${retryAttempt}`}
              src={imageUrl}
              alt=""
              style={{ transformOrigin: `${focusX}% ${focusY}%` }}
              onError={() => setImageFailed(true)}
            />
          </figure>
        ) : <div className="scene-clue-focus__image-fallback" role="status">
          <p>{imageFailed ? '照片暂时无法显示，下面的观察记录仍可阅读。' : '相关照片暂不可用，下面的观察记录仍可阅读。'}</p>
          {activeImageSrc && <button type="button" onClick={() => { setImageFailed(false); setRetryAttempt((attempt) => attempt + 1); }}>重试加载照片</button>}
        </div>}
        <p id={descriptionId}>{hotspot.observation}</p>
      </section>
    </div>
  );
}
