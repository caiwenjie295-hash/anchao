import { useLayoutEffect, useRef, type ReactNode } from 'react';

export function SceneTransitionLayer({ children }: { children: ReactNode }) {
  const layerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = layerRef.current;
    if (!element || typeof window === 'undefined' || typeof document === 'undefined' || document.documentElement.dataset.sceneTransition === 'active') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true) return;
    if (typeof element.animate !== 'function') {
      element.classList.add('scene-transition-layer--arriving');
      const timer = window.setTimeout(() => element.classList.remove('scene-transition-layer--arriving'), 240);
      return () => { window.clearTimeout(timer); element.classList.remove('scene-transition-layer--arriving'); };
    }
    try {
      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 240,
        easing: 'ease-out',
        fill: 'both',
      });
      animation.onfinish = () => animation.cancel();
      return () => animation.cancel();
    } catch {
      element.classList.add('scene-transition-layer--arriving');
      const timer = window.setTimeout(() => element.classList.remove('scene-transition-layer--arriving'), 240);
      return () => { window.clearTimeout(timer); element.classList.remove('scene-transition-layer--arriving'); };
    }
  }, []);
  return <div ref={layerRef} className="scene-transition-layer">{children}</div>;
}
