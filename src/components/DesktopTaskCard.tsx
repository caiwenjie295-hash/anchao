import { useState } from 'react';
import type { AppId, AppState } from '../core/types';
import { getCurrentTaskGuide } from '../data/taskGuideData';

const startsExpanded = (): boolean => (
  typeof window !== 'undefined' && window.matchMedia?.('(min-width: 900px)').matches === true
);

export function DesktopTaskCard({ state, onOpenApp }: { state: AppState; onOpenApp: (appId: AppId) => void }) {
  const guide = getCurrentTaskGuide(state);
  const [expanded, setExpanded] = useState(startsExpanded);
  if (!guide) return null;

  const bodyId = `desktop-task-card-${guide.id}`;
  const actionAppId = guide.actionAppId;
  const actionLabel = guide.actionLabel;
  return <aside className={`desktop-task-card${expanded ? ' desktop-task-card--expanded' : ''}`} aria-label={guide.title}>
    <button
      type="button"
      className="desktop-task-card__toggle"
      aria-expanded={expanded}
      aria-controls={bodyId}
      onClick={() => setExpanded((current) => !current)}
    >
      <span className="desktop-task-card__toggle-title">{guide.title}</span>
      <span className="desktop-task-card__count" aria-label={`已完成 ${guide.completedCount} / ${guide.totalCount}`}>{guide.completedCount}/{guide.totalCount}</span>
      <span className="desktop-task-card__chevron" aria-hidden="true">⌄</span>
    </button>
    {expanded && <div className="desktop-task-card__body" id={bodyId}>
      <p className="desktop-task-card__summary">{guide.summary}</p>
      <ol className="desktop-task-card__steps">
        {guide.steps.map((step) => <li key={step.label} className={`desktop-task-card__step${step.complete ? ' desktop-task-card__step--complete' : ''}${step.current ? ' desktop-task-card__step--current' : ''}`}>
          <span className="desktop-task-card__status" aria-hidden="true">{step.complete ? '✓' : ''}</span>
          <span className="desktop-task-card__step-label">{step.label}</span>
          {step.current && <span className="desktop-task-card__current">当前</span>}
        </li>)}
      </ol>
      {actionAppId && actionLabel && <button type="button" className="desktop-task-card__action" onClick={() => onOpenApp(actionAppId)}>{actionLabel}</button>}
    </div>}
  </aside>;
}
