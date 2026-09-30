import { useState } from 'react';
import type { InvestigationAction } from './types';
import './investigation.css';

export interface InvestigationNavigationProps {
  actions: InvestigationAction[];
  label?: string;
  compact?: boolean;
}

const idPart = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

export function InvestigationNavigation({ actions, label = '可前往地点与主要行动', compact = false }: InvestigationNavigationProps) {
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const visibleActions = actions.filter((action) => action.state !== 'unavailable');

  if (!visibleActions.length) return null;

  return (
    <nav className={'investigation-navigation' + (compact ? ' investigation-navigation--compact' : '')} aria-label={label}>
      {!compact && <h2 className="investigation-navigation__title">{label}</h2>}
      <div className="investigation-navigation__actions">
        {visibleActions.map((action) => {
          const reasonId = 'investigation-reason-' + idPart(action.actionId);
          const expanded = expandedActionId === action.actionId;
          const blocked = action.state === 'blocked';
          const completed = action.state === 'completed';
          const statusLabel = blocked ? '查看原因' : completed ? '已完成' : '';
          return (
            <div className="investigation-navigation__item" key={action.actionId}>
              <button
                type="button"
                className={'investigation-navigation__action investigation-navigation__action--' + action.kind + ' investigation-navigation__action--' + action.state}
                data-action-id={action.actionId}
                data-action-state={action.state}
                data-action-kind={action.kind}
                aria-expanded={blocked ? expanded : undefined}
                aria-controls={blocked ? reasonId : undefined}
                aria-describedby={blocked && expanded ? reasonId : undefined}
                disabled={completed}
                onClick={(event) => {
                  if (blocked) {
                    setExpandedActionId(expanded ? null : action.actionId);
                    return;
                  }
                  if (action.state === 'ready') action.onActivate?.(event.currentTarget);
                }}
              >
                <span>{action.label}</span>
                {statusLabel && <small>{statusLabel}</small>}
              </button>
              {blocked && expanded && (
                <div className="investigation-navigation__reason" id={reasonId} role="note">
                  <p>{action.reason || '这项行动目前还不能继续。'}</p>
                  {action.onOpenMaterial && action.relatedMaterials?.map((material) => (
                    <button
                      type="button"
                      className="investigation-navigation__material"
                      key={material.id}
                      onClick={() => action.onOpenMaterial?.(material)}
                    >
                      查看相关材料：{material.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
