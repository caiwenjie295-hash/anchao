import { useState, type ReactNode } from 'react';
import type { InvestigationAction } from './types';
import { InvestigationNavigation } from './InvestigationNavigation';
import { useInvestigationProgress } from '../InvestigationProgressContext';
import './investigation.css';

export interface InvestigationShellProps {
  ariaLabel: string;
  actLabel: string;
  locationLabel: string;
  contextLabel?: string;
  objective: string;
  helpText?: string;
  exitLabel?: string;
  className?: string;
  actions?: InvestigationAction[];
  statusMessage?: string;
  children: ReactNode;
  onExit: () => void;
  onOpenMaterial?: (actionId: string, materialId: string) => void;
}

export function InvestigationShell({
  ariaLabel,
  actLabel,
  locationLabel,
  contextLabel,
  objective,
  helpText,
  exitLabel = '退出调查，返回桌面',
  className,
  actions = [],
  statusMessage,
  children,
  onExit,
  onOpenMaterial,
}: InvestigationShellProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const progressContext = useInvestigationProgress();
  const onDemandGuidance = (className ?? '').split(/\s+/).some((name) =>
    name === 'investigation-shell--reading' || name === 'investigation-shell--exploration' || name === 'investigation-shell--memory',
  );
  const navigationActions = actions.map((action) => ({
    ...action,
    onOpenMaterial: action.relatedMaterials && onOpenMaterial
      ? (material: { id: string }) => onOpenMaterial(action.actionId, material.id)
      : action.onOpenMaterial,
  }));

  return (
    <section className={`investigation-shell${className ? ` ${className}` : ''}`} aria-label={ariaLabel}>
      <header className="investigation-shell__header">
        <div className="investigation-shell__place">
          <p>{actLabel}</p>
          <h1>{locationLabel}</h1>
          {contextLabel && <span>{contextLabel}</span>}
        </div>
        <div className="investigation-shell__header-actions">
          {progressContext && <button type="button" className="investigation-progress-trigger" aria-label="打开调查进度" onClick={(event) => progressContext.openProgress(event.currentTarget)}>调查进度</button>}
          <button type="button" className="investigation-shell__exit" onClick={onExit}>{exitLabel}</button>
        </div>
      </header>
      <div className={`investigation-shell__goal${onDemandGuidance ? ' investigation-shell__goal--on-demand' : ''}`}>
        {onDemandGuidance ? (
          <details className="investigation-shell__goal-details">
            <summary>当前目标与操作提示</summary>
            <div className="investigation-shell__goal-content">
              <p><strong>当前目标</strong><span>{objective}</span></p>
              {helpText && <p><strong>操作提示</strong><span>{helpText}</span></p>}
            </div>
          </details>
        ) : (
          <>
            <p><strong>当前目标</strong><span>{objective}</span></p>
            {helpText && (
              <button type="button" aria-expanded={helpOpen} onClick={() => setHelpOpen((open) => !open)}>
                {helpOpen ? '收起操作帮助' : '操作帮助'}
              </button>
            )}
          </>
        )}
      </div>
      {!onDemandGuidance && helpOpen && <p className="investigation-shell__help" role="status">{helpText}</p>}
      <main className="investigation-shell__scene">{children}</main>
      {actions.length > 0 && (
        <div className="investigation-shell__operations">
          <InvestigationNavigation actions={navigationActions} />
        </div>
      )}
      {statusMessage && <p className="investigation-shell__status" role="status" aria-live="polite">{statusMessage}</p>}
    </section>
  );
}
