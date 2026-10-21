import { useState } from 'react';
import type { InvestigationAction } from './types';
import './investigation.css';

export interface InvestigationNavigationProps {
  actions: InvestigationAction[];
  label?: string;
  compact?: boolean;
  presentation?: 'standard' | 'photo-stage';
}

const idPart = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

export function InvestigationNavigation({ actions, label = '可前往地点与主要行动', compact = false, presentation = 'standard' }: InvestigationNavigationProps) {
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const visibleActions = actions.filter((action) => action.state !== 'unavailable');
  const preferredPrimaryAction = visibleActions.find((action) => action.state === 'ready' && action.kind === 'story')
    ?? visibleActions.find((action) => action.state === 'ready' && action.kind === 'memory')
    ?? visibleActions.find((action) => action.state === 'ready' && action.kind === 'move');
  const soleReadyAction = visibleActions.filter((action) => action.state === 'ready');
  const primaryAction = preferredPrimaryAction ?? (soleReadyAction.length === 1 ? soleReadyAction[0] : undefined);

  const renderAction = (action: InvestigationAction, emphasis: 'primary' | 'secondary', displayLabel = action.label) => {
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
          data-action-emphasis={emphasis}
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
          <span>{displayLabel}</span>
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
  };

  if (!visibleActions.length) return null;

  if (presentation === 'photo-stage') {
    const previousAction = visibleActions.find((action) => action.kind === 'return');
    const nextAction = visibleActions.find((action) => action.kind === 'move');
    const primaryIds = new Set([previousAction?.actionId, nextAction?.actionId].filter((id): id is string => Boolean(id)));
    const secondaryActions = visibleActions.filter((action) => !primaryIds.has(action.actionId));
    const extraRouteOrdinals = new Map<string, number>();
    const secondaryLabels = new Map<string, string>();
    secondaryActions.forEach((action) => {
      if (action.kind !== 'move' && action.kind !== 'return') return;
      const ordinal = (extraRouteOrdinals.get(action.kind) ?? 0) + 1;
      extraRouteOrdinals.set(action.kind, ordinal);
      if (action.label === '下一张现场照片') secondaryLabels.set(action.actionId, `其他前进路线 ${ordinal}`);
      else if (action.label === '返回上一张现场照片') secondaryLabels.set(action.actionId, `其他返回路线 ${ordinal}`);
    });
    return (
      <nav className="investigation-navigation investigation-navigation--photo-stage" aria-label="现场照片导航与其他行动">
        <div className="investigation-navigation__photo-pair">
          {previousAction
            ? renderAction(previousAction, 'primary', '上一张')
            : <button type="button" className="investigation-navigation__photo-empty" disabled aria-label="没有上一张现场照片">上一张</button>}
          {nextAction
            ? renderAction(nextAction, 'primary', '下一张')
            : <button type="button" className="investigation-navigation__photo-empty" disabled aria-label="当前路线没有下一张现场照片">下一张</button>}
        </div>
        {secondaryActions.length > 0 && <details className="investigation-navigation__other-actions">
          <summary aria-label={`打开其他地点与行动及阶段动作，共${secondaryActions.length}项`}>
            <span>更多地点与行动</span><span aria-hidden="true">{secondaryActions.length}</span>
          </summary>
          <div className="investigation-navigation__actions">
            {secondaryActions.map((action) => renderAction(action, 'secondary', secondaryLabels.get(action.actionId) ?? action.label))}
          </div>
        </details>}
      </nav>
    );
  }

  return (
    <nav className={'investigation-navigation' + (compact ? ' investigation-navigation--compact' : '')} aria-label={label}>
      {!compact && <h2 className="investigation-navigation__title">{label}</h2>}
      <div className="investigation-navigation__actions">
        {visibleActions.map((action) => renderAction(action, action === primaryAction ? 'primary' : 'secondary'))}
      </div>
    </nav>
  );
}
