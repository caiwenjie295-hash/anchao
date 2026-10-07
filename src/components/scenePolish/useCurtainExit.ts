import { useCallback, useEffect, useRef, useState } from 'react';

function prefersReducedMotion(forceReducedMotion: boolean): boolean {
  if (forceReducedMotion) return true;
  try {
    return typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return true;
  }
}

/** Briefly fades a visible scene curtain out before its caller commits the existing action. */
export function useCurtainExit(onExit: () => void, duration = 240, forceReducedMotion = false) {
  const [closing, setClosing] = useState(false);
  const currentExitRef = useRef(onExit);
  const pendingExitRef = useRef<(() => void) | null>(null);
  const exitedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  currentExitRef.current = onExit;

  useEffect(() => () => {
    if (timerRef.current !== null && typeof window !== 'undefined') window.clearTimeout(timerRef.current);
  }, []);

  const beginExit = useCallback((nextExit?: () => void) => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    pendingExitRef.current = nextExit ?? currentExitRef.current;
    if (prefersReducedMotion(forceReducedMotion) || typeof window === 'undefined' || duration <= 0) {
      pendingExitRef.current?.();
      pendingExitRef.current = null;
      return;
    }
    setClosing(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      pendingExitRef.current?.();
      pendingExitRef.current = null;
    }, duration);
  }, [duration, forceReducedMotion]);

  return { closing, beginExit };
}
