import { useState } from 'react';
import type { AppId, AppState } from '../core/types';
import { getCurrentTaskGuide } from '../data/taskGuideData';

export function DesktopTaskCard({ state, onOpenApp }: { state: AppState; onOpenApp: (appId: AppId) => void }) {
  const guide = getCurrentTaskGuide(state);
  const [expanded, setExpanded] = useState(false);
  const [revealedHints, setRevealedHints] = useState<string[]>([]);
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
        {guide.steps.map((step, index) => <li key={step.label} className={`desktop-task-card__step${step.complete ? ' desktop-task-card__step--complete' : ''}${step.current ? ' desktop-task-card__step--current' : ''}`}>
          <span className="desktop-task-card__status" aria-hidden="true">{step.complete ? '✓' : ''}</span>
          <span className="desktop-task-card__step-label">{step.hint ? <>
            <button type="button" className="desktop-task-card__hint-toggle" aria-expanded={revealedHints.includes(`${guide.id}:${index}`)} onClick={() => setRevealedHints((current) => current.includes(`${guide.id}:${index}`) ? current.filter((id) => id !== `${guide.id}:${index}`) : [...current, `${guide.id}:${index}`])}>{step.label} <small>{revealedHints.includes(`${guide.id}:${index}`) ? '收起暗示' : '查看暗示'}</small></button>
            {revealedHints.includes(`${guide.id}:${index}`) && <span className="desktop-task-card__hint">{step.hint}</span>}
          </> : step.label}</span>
          {step.current && <span className="desktop-task-card__current">当前</span>}
        </li>)}
      </ol>
      {actionAppId && actionLabel && <button type="button" className="desktop-task-card__action" onClick={() => onOpenApp(actionAppId)}>{actionLabel}</button>}
    </div>}
  </aside>;
}
