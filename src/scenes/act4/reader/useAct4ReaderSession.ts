import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { Act4Stage } from '../../../core/types';
import type { ActiveAct4NarrativeStage } from '../../../story/act4/narrativePolicy';

type Transition = (update: () => void) => unknown;

export function useAct4ReaderSession(
  readerRef: RefObject<HTMLElement | null>,
  currentStage: Act4Stage,
  transition: Transition,
) {
  const [reviewStage, setReviewStage] = useState<ActiveAct4NarrativeStage | null>(null);
  const savedCurrentPositionRef = useRef<{ scrollTop: number } | null>(null);
  const reviewTriggerRef = useRef<string | null>(null);
  const returningToCurrentRef = useRef(false);
  const skipPageAutoScrollRef = useRef(false);
  const reviewing = reviewStage !== null && reviewStage !== currentStage;
  const displayedStage = reviewStage ?? currentStage;

  const returnToCurrent = useCallback(() => {
    returningToCurrentRef.current = true;
    skipPageAutoScrollRef.current = true;
    transition(() => setReviewStage(null));
  }, [transition]);

  const openReview = useCallback((targetStage: ActiveAct4NarrativeStage, triggerKey: string) => {
    if (targetStage === currentStage) {
      if (reviewStage !== null) returnToCurrent();
      return;
    }
    if (reviewStage === null) {
      const scene = readerRef.current?.closest<HTMLElement>('.investigation-shell__scene');
      savedCurrentPositionRef.current = { scrollTop: scene?.scrollTop ?? 0 };
      reviewTriggerRef.current = triggerKey;
    }
    transition(() => setReviewStage(targetStage));
  }, [currentStage, readerRef, reviewStage, returnToCurrent, transition]);

  useLayoutEffect(() => {
    const scene = readerRef.current?.closest<HTMLElement>('.investigation-shell__scene');
    if (!scene) return;
    if (reviewing) {
      scene.scrollTop = 0;
      readerRef.current?.focus({ preventScroll: true });
      return;
    }
    if (returningToCurrentRef.current && savedCurrentPositionRef.current) {
      scene.scrollTop = savedCurrentPositionRef.current.scrollTop;
      returningToCurrentRef.current = false;
      savedCurrentPositionRef.current = null;
      const triggerKey = reviewTriggerRef.current;
      const trigger = triggerKey
        ? [...(readerRef.current?.querySelectorAll<HTMLElement>('[data-review-trigger]') ?? [])].find((item) => item.dataset.reviewTrigger === triggerKey)
        : undefined;
      reviewTriggerRef.current = null;
      (trigger ?? readerRef.current)?.focus({ preventScroll: true });
    } else {
      scene.scrollTop = 0;
      readerRef.current?.focus({ preventScroll: true });
    }
  }, [displayedStage, readerRef, reviewing]);

  return { reviewStage, reviewing, openReview, returnToCurrent, skipPageAutoScrollRef };
}
