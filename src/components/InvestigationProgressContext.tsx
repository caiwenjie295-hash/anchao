import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppId, AppState } from '../core/types';
import { deriveInvestigationProgress, type InvestigationProgressModel } from '../data/investigationProgressData';

export interface InvestigationProgressContextValue {
  openProgress: (trigger: HTMLElement) => void;
  closeProgress: () => void;
  isOpen: boolean;
  currentContentActive: boolean;
  onOpenApp?: (appId: AppId) => void;
  onContinueInvestigation?: () => void;
  onReviewAct3?: () => void;
  progress: InvestigationProgressModel;
}

const InvestigationProgressContext = createContext<InvestigationProgressContextValue | null>(null);

export function useInvestigationProgress(): InvestigationProgressContextValue | null {
  return useContext(InvestigationProgressContext);
}

export function InvestigationProgressProvider({
  children,
  state,
  suppressed = false,
  currentContentActive = false,
  onOpenApp,
  onContinueInvestigation,
  onReviewAct3,
}: {
  children: ReactNode;
  state: AppState;
  suppressed?: boolean;
  currentContentActive?: boolean;
  onOpenApp?: (appId: AppId) => void;
  onContinueInvestigation?: () => void;
  onReviewAct3?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const progress = useMemo(() => deriveInvestigationProgress(state), [state.game, state.modules]);
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const suppressedRef = useRef(suppressed);
  suppressedRef.current = suppressed;

  const closeProgress = useCallback(() => setIsOpen(false), []);
  const openProgress = useCallback((trigger: HTMLElement) => {
    if (suppressedRef.current) return;
    if (document.querySelector('[aria-modal="true"], dialog[open]')) return;
    openerRef.current = trigger;
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (suppressed) setIsOpen(false);
  }, [suppressed]);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      const opener = openerRef.current;
      if (opener?.isConnected) opener.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const value = useMemo(() => ({ openProgress, closeProgress, isOpen, currentContentActive, onOpenApp, onContinueInvestigation, onReviewAct3, progress }), [openProgress, closeProgress, isOpen, currentContentActive, onOpenApp, onContinueInvestigation, onReviewAct3, progress]);

  return <InvestigationProgressContext.Provider value={value}>
    {children}
  </InvestigationProgressContext.Provider>;
}
