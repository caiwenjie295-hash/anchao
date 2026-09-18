import { useEffect, useRef } from 'react';
import type { SceneHotspot } from '../../data/sceneData';

export interface SceneClueFocusProps {
  hotspot: SceneHotspot;
  imageSrc?: string;
  backgroundSrc?: string;
  onClose: () => void;
}

/** A transient, non-persisted close-up for a scene observation. */
export function SceneClueFocus({ hotspot, imageSrc, backgroundSrc, onClose }: SceneClueFocusProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = `scene-clue-focus-${hotspot.id}`;
  const descriptionId = `${titleId}-description`;
  const focusX = hotspot.position.x + hotspot.position.width / 2;
  const focusY = hotspot.position.y + hotspot.position.height / 2;
  const isIndependentImage = Boolean(imageSrc);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="scene-clue-focus"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section className="scene-clue-focus__panel">
        <header className="scene-clue-focus__header">
          <h2 id={titleId}>{hotspot.label}</h2>
          <button ref={closeButtonRef} type="button" onClick={onClose}>关闭特写</button>
        </header>
        {isIndependentImage ? (
          <figure className="scene-clue-focus__image scene-clue-focus__image--independent">
            <img src={imageSrc} alt={hotspot.label} data-asset-id={hotspot.imageAssetId} />
          </figure>
        ) : backgroundSrc ? (
          <figure className="scene-clue-focus__image scene-clue-focus__image--background" aria-label={`${hotspot.label}的局部放大`}>
            <img
              src={backgroundSrc}
              alt=""
              style={{ transformOrigin: `${focusX}% ${focusY}%` }}
            />
          </figure>
        ) : null}
        <p id={descriptionId}>{hotspot.observation}</p>
      </section>
    </div>
  );
}
