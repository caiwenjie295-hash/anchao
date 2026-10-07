import { useEffect, useState } from 'react';

export const ENDING_REVEAL_STEP_MS = 240;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export function useAct4EndingReveal() {
  const [revealStage, setRevealStage] = useState(() => prefersReducedMotion() ? 3 : 0);
  useEffect(() => {
    if (revealStage >= 3 || prefersReducedMotion()) return;
    const timer = window.setTimeout(() => setRevealStage((stage) => Math.min(3, stage + 1)), ENDING_REVEAL_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [revealStage]);
  const showAll = () => setRevealStage(3);
  return { revealStage, showAll };
}
