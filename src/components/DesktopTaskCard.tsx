import { useState } from 'react';
import type { AppId, AppState } from '../core/types';
import { getCurrentTaskGuide } from '../data/taskGuideData';
import { getDesktopTaskPresentation } from '../data/investigationProgressData';
import { getSearchGuidance } from '../data/searchGuidance';
import { useInvestigationProgress } from './InvestigationProgressContext';

export function DesktopTaskCard({
  state,
  onOpenApp,
  showProgressTrigger = true,
  className,
  onResumeScene,
  resumeSceneLabel,
  onPrepareDeparture,
  expanded: expandedProp,
  onExpandedChange,
}: {
  state: AppState;
  onOpenApp: (appId: AppId) => void;
  /** Retained as an optional display switch; existing callers need no changes. */
  showProgressTrigger?: boolean;
  className?: string;
  onResumeScene?: () => void;
  resumeSceneLabel?: string;
  onPrepareDeparture?: (trigger: HTMLButtonElement) => void;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(false);
  const expanded = expandedProp ?? uncontrolledExpanded;
  const [revealedHints, setRevealedHints] = useState<string[]>([]);
  const progressContext = useInvestigationProgress();
  const legacyGuide = getCurrentTaskGuide(state);
  const pendingDeparture = state.game.phase === 'F' && !state.modules.scene.journeyStarted;
  if (!progressContext && !legacyGuide && !pendingDeparture) return null;
  const setExpanded = (nextExpanded: boolean) => {
    if (onExpandedChange) onExpandedChange(nextExpanded);
    else setUncontrolledExpanded(nextExpanded);
  };

  const basePresentation = getDesktopTaskPresentation(state);
  const searchGuidance = getSearchGuidance(state);
  const presentation = pendingDeparture ? {
    ...basePresentation,
    title: '徒步资料已整理',
    summary: '前往鸡公岭前的路线与准备资料已整理。你可以继续查阅，也可以整理线索、准备出发。',
    nextAction: '资料仍可继续查阅；准备好后点击“整理线索 / 准备出发”，再确认前往鸡公岭。',
    completedCount: 1,
    totalCount: 1,
    steps: [],
    actionAppId: undefined,
    actionLabel: undefined,
  } : basePresentation;
  const bodyId = `desktop-task-card-${state.game.phase}`;
  return <aside className={`desktop-task-card${className ? ` ${className}` : ''}${expanded ? ' desktop-task-card--expanded' : ''}`} aria-label={presentation.title}>
    <div className="desktop-task-card__heading">
      <button
        type="button"
        className="desktop-task-card__toggle"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={() => setExpanded(!expanded)}
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
    {searchGuidance.length > 0 && <p className="desktop-task-card__search-guidance"><strong>接下来在浏览器搜：</strong><span>{searchGuidance.map(({ query }) => `“${query}”`).join('、')}</span></p>}
    {pendingDeparture ? <div className="desktop-task-card__departure-actions">
      <button type="button" className="desktop-task-card__resume" onClick={() => onOpenApp('browser')}>继续查阅资料</button>
      {onPrepareDeparture && <button type="button" className="desktop-task-card__prepare" onClick={(event) => onPrepareDeparture(event.currentTarget)}>整理线索 / 准备出发</button>}
    </div> : onResumeScene && resumeSceneLabel && <button type="button" className="desktop-task-card__resume" onClick={onResumeScene}>{resumeSceneLabel}</button>}
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
