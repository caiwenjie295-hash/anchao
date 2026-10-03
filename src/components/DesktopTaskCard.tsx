import { useState } from 'react';
import type { AppId, AppState } from '../core/types';
import { getCurrentTaskGuide } from '../data/taskGuideData';
import { getDesktopTaskPresentation } from '../data/investigationProgressData';
import { useInvestigationProgress } from './InvestigationProgressContext';

export function DesktopTaskCard({
  state,
  onOpenApp,
  showProgressTrigger = true,
}: {
  state: AppState;
  onOpenApp: (appId: AppId) => void;
  /** Retained as an optional display switch; existing callers need no changes. */
  showProgressTrigger?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [revealedHints, setRevealedHints] = useState<string[]>([]);
  const progressContext = useInvestigationProgress();
  const legacyGuide = getCurrentTaskGuide(state);
  if (!progressContext && !legacyGuide) return null;

  const presentation = getDesktopTaskPresentation(state);
  const bodyId = `desktop-task-card-${state.game.phase}`;
  return <aside className={`desktop-task-card${expanded ? ' desktop-task-card--expanded' : ''}`} aria-label={presentation.title}>
    <div className="desktop-task-card__heading">
      <button
        type="button"
        className="desktop-task-card__toggle"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="desktop-task-card__toggle-title">{presentation.title}</span>
        <span className="desktop-task-card__count" aria-label={`已完成 ${presentation.completedCount} / ${presentation.totalCount}`}>{presentation.completedCount}/{presentation.totalCount}</span>
        <span className="desktop-task-card__chevron" aria-hidden="true">⌄</span>
      </button>
      {progressContext && showProgressTrigger && <button
        type="button"
        className="desktop-task-card__progress"
        aria-label="打开调查进度"
        onClick={(event) => progressContext.openProgress(event.currentTarget)}
      >调查进度</button>}
    </div>
    <p className="desktop-task-card__next"><strong>下一步</strong><span>{presentation.nextAction}</span></p>
    {expanded && <div className="desktop-task-card__body" id={bodyId}>
      <p className="desktop-task-card__summary">{presentation.summary}</p>
      <ol className="desktop-task-card__steps">
        {presentation.steps.map((step) => <li key={step.id} className={`desktop-task-card__step${step.complete ? ' desktop-task-card__step--complete' : ''}${step.current ? ' desktop-task-card__step--current' : ''}`}>
          <span className="desktop-task-card__status" aria-hidden="true">{step.complete ? '✓' : ''}</span>
          <span className="desktop-task-card__step-label">{step.hint ? <>
            <button type="button" className="desktop-task-card__hint-toggle" aria-expanded={revealedHints.includes(`${step.id}`)} onClick={() => setRevealedHints((current) => current.includes(step.id) ? current.filter((id) => id !== step.id) : [...current, step.id])}>{step.label} <small>{revealedHints.includes(step.id) ? '收起暗示' : '查看暗示'}</small></button>
            {revealedHints.includes(step.id) && <span className="desktop-task-card__hint">{step.hint}</span>}
          </> : step.label}</span>
          {step.current && <span className="desktop-task-card__current">当前</span>}
        </li>)}
      </ol>
      {presentation.actionAppId && presentation.actionLabel && <button type="button" className="desktop-task-card__action" onClick={() => onOpenApp(presentation.actionAppId!)}>{presentation.actionLabel}</button>}
    </div>}
  </aside>;
}
