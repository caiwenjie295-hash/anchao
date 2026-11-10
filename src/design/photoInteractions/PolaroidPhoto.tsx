import { useEffect, useRef, type ReactNode } from 'react';
import './photoInteractions.css';

export interface PolaroidPhotoProps {
  children: ReactNode;
  caption: string;
  className?: string;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** A paper-backed evidence image with small, optional pointer tilt. */
export function PolaroidPhoto({ children, caption, className = '' }: PolaroidPhotoProps) {
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const finePointer = typeof window.matchMedia === 'function'
      ? window.matchMedia('(hover: hover) and (pointer: fine)')
      : null;
    const reducedMotion = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    let canTilt = false;
    let animationFrame: number | null = null;
    let animationUsesTimeout = false;
    let pointer: { x: number; y: number } | null = null;

    const cancelFrame = () => {
      if (animationFrame === null) return;
      if (animationUsesTimeout) window.clearTimeout(animationFrame);
      else if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    };

    const resetTilt = () => {
      card.dataset.pointerActive = 'false';
      card.style.removeProperty('--polaroid-tilt-x');
      card.style.removeProperty('--polaroid-tilt-y');
    };

    const updateMode = () => {
      canTilt = finePointer?.matches === true && reducedMotion?.matches !== true;
      card.dataset.followPointer = String(canTilt);
      if (!canTilt) {
        cancelFrame();
        pointer = null;
        resetTilt();
      }
    };

    const updateTilt = () => {
      animationFrame = null;
      if (!canTilt || !pointer) return;
      const bounds = card.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const normalizedX = clamp((pointer.x - bounds.left) / bounds.width, 0, 1) - 0.5;
      const normalizedY = clamp((pointer.y - bounds.top) / bounds.height, 0, 1) - 0.5;
      const rotateX = clamp(-normalizedY * 6, -3, 3);
      const rotateY = clamp(normalizedX * 6, -3, 3);
      card.style.setProperty('--polaroid-tilt-x', `${rotateX.toFixed(2)}deg`);
      card.style.setProperty('--polaroid-tilt-y', `${rotateY.toFixed(2)}deg`);
      card.dataset.pointerActive = 'true';
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!canTilt || event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      if (animationFrame !== null) return;
      if (typeof window.requestAnimationFrame === 'function') {
        animationUsesTimeout = false;
        animationFrame = window.requestAnimationFrame(updateTilt);
      } else {
        animationUsesTimeout = true;
        animationFrame = window.setTimeout(updateTilt, 16);
      }
    };

    const onPointerLeave = () => {
      cancelFrame();
      pointer = null;
      resetTilt();
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
    card.addEventListener('pointermove', onPointerMove);
    card.addEventListener('pointerleave', onPointerLeave);
    card.addEventListener('pointercancel', onPointerLeave);

    return () => {
      card.removeEventListener('pointermove', onPointerMove);
      card.removeEventListener('pointerleave', onPointerLeave);
      card.removeEventListener('pointercancel', onPointerLeave);
      unsubscribeFinePointer();
      unsubscribeReducedMotion();
      cancelFrame();
    };
  }, []);

  return <figure
    ref={cardRef}
    className={`polaroid-photo${className ? ` ${className}` : ''}`}
    data-follow-pointer="false"
    data-pointer-active="false"
  >
    {children}
    <figcaption>{caption}</figcaption>
  </figure>;
}

export default PolaroidPhoto;
