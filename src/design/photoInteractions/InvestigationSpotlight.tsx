import { useEffect, useRef, type RefObject } from 'react';
import './photoInteractions.css';

export interface InvestigationSpotlightProps {
  /** The stable photo frame, not the scaled image plane. */
  frameRef: RefObject<HTMLElement | null>;
  message?: string;
  staticMessage?: string;
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

/** A non-interactive visual veil; all pointer and keyboard behavior stays with the frame. */
export function InvestigationSpotlight({
  frameRef,
  message = '滑动鼠标调查，点击高亮点查看',
  staticMessage = '点击高亮点查看',
}: InvestigationSpotlightProps) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = frameRef.current;
    const layer = layerRef.current;
    if (!host || !layer) return;

    const finePointer = typeof window.matchMedia === 'function'
      ? window.matchMedia('(hover: hover) and (pointer: fine)')
      : null;
    const reducedMotion = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    let canFollowPointer = false;
    let animationFrame: number | null = null;
    let animationUsesTimeout = false;
    let hintTimer: number | null = null;
    let pointer: { x: number; y: number } | null = null;

    const cancelFrame = () => {
      if (animationFrame === null) return;
      if (animationUsesTimeout) window.clearTimeout(animationFrame);
      else if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    };

    const resetSpotlight = () => {
      layer.dataset.pointerActive = 'false';
      layer.style.removeProperty('--spotlight-x');
      layer.style.removeProperty('--spotlight-y');
    };

    const updateMode = () => {
      canFollowPointer = finePointer?.matches === true && reducedMotion?.matches !== true;
      layer.dataset.followPointer = String(canFollowPointer);
      if (!canFollowPointer) {
        cancelFrame();
        pointer = null;
        resetSpotlight();
      }
    };

    const updatePosition = () => {
      animationFrame = null;
      if (!canFollowPointer || !pointer) return;
      const bounds = host.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const x = clampPercent(((pointer.x - bounds.left) / bounds.width) * 100);
      const y = clampPercent(((pointer.y - bounds.top) / bounds.height) * 100);
      layer.style.setProperty('--spotlight-x', `${x}%`);
      layer.style.setProperty('--spotlight-y', `${y}%`);
      layer.dataset.pointerActive = 'true';
      if (hintTimer === null && layer.dataset.hintDismissed !== 'true') {
        hintTimer = window.setTimeout(() => {
          hintTimer = null;
          layer.dataset.hintDismissed = 'true';
        }, 1900);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!canFollowPointer || event.pointerType === 'touch') return;
      if ((event.target as Element | null)?.closest?.('[data-photo-control]')) return;
      pointer = { x: event.clientX, y: event.clientY };
      if (animationFrame !== null) return;
      if (typeof window.requestAnimationFrame === 'function') {
        animationUsesTimeout = false;
        animationFrame = window.requestAnimationFrame(updatePosition);
      } else {
        animationUsesTimeout = true;
        animationFrame = window.setTimeout(updatePosition, 16);
      }
    };

    const onPointerLeave = () => {
      cancelFrame();
      pointer = null;
      resetSpotlight();
    };

    const subscribe = (media: MediaQueryList | null) => {
      if (!media) return () => {};
      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', updateMode);
        return () => media.removeEventListener('change', updateMode);
      }
      media.addListener?.(updateMode);
      return () => media.removeListener?.(updateMode);
    };

    updateMode();
    const unsubscribeFinePointer = subscribe(finePointer);
    const unsubscribeReducedMotion = subscribe(reducedMotion);
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerleave', onPointerLeave);
    host.addEventListener('pointercancel', onPointerLeave);

    return () => {
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
      host.removeEventListener('pointercancel', onPointerLeave);
      unsubscribeFinePointer();
      unsubscribeReducedMotion();
      cancelFrame();
      if (hintTimer !== null) window.clearTimeout(hintTimer);
      hintTimer = null;
    };
  }, [frameRef]);

  return <div ref={layerRef} className="investigation-spotlight" data-follow-pointer="false" data-pointer-active="false" data-hint-dismissed="false" aria-hidden="true">
    <span className="investigation-spotlight__message investigation-spotlight__message--tracking">{message}</span>
    <span className="investigation-spotlight__message investigation-spotlight__message--static">{staticMessage}</span>
  </div>;
}

export default InvestigationSpotlight;
