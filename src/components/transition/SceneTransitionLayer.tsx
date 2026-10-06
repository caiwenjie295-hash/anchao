import { useLayoutEffect, useRef, type ReactNode } from 'react';

export function SceneTransitionLayer({ children }: { children: ReactNode }) {
  const layerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = layerRef.current;
    if (!element || typeof window === 'undefined' || typeof document === 'undefined' || document.documentElement.dataset.sceneTransition === 'active') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true || !element.animate) return;
    const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 240,
      easing: 'ease-out',
      fill: 'both',
    });
    animation.onfinish = () => animation.cancel();
    return () => animation.cancel();
  }, []);
  return <div ref={layerRef} className="scene-transition-layer">{children}</div>;
}
