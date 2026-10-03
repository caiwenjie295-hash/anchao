import { useEffect, useRef } from 'react';
import type { AppState } from '../core/types';
import { deriveInvestigationProgress, type InvestigationProgressFact, type ProgressNodeStatus } from '../data/investigationProgressData';
import { useInvestigationProgress } from './InvestigationProgressContext';
import './investigationProgress.css';

const statusLabel: Record<ProgressNodeStatus, string> = {
  complete: '已完成', current: '当前', known: '已到达', upcoming: '尚未展开',
};

const factStatusLabel: Record<InvestigationProgressFact['status'], string> = {
  read: '已读', noted: '已记入笔记', recorded: '已记录', inspected: '已检视',
};

export function InvestigationProgressDrawer({ state }: { state: AppState }) {
  const progressContext = useInvestigationProgress();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const model = deriveInvestigationProgress(state);
  const isOpen = progressContext?.isOpen ?? false;
  const closeProgress = progressContext?.closeProgress ?? (() => {});
  const onOpenApp = progressContext?.onOpenApp;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      closeRef.current?.focus();
    } else if (!isOpen && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [isOpen]);

  if (!progressContext) return null;

  return <dialog
    ref={dialogRef}
    className="investigation-progress"
    aria-labelledby="investigation-progress-title"
    aria-describedby="investigation-progress-next-action"
    onCancel={() => closeProgress()}
    onClose={() => { if (progressContext.isOpen) closeProgress(); }}
  >
    <header className="investigation-progress__header">
      <div>
        <p>{model.actLabel} · 调查进度</p>
        <h2 id="investigation-progress-title">{model.location}</h2>
      </div>
      <button ref={closeRef} type="button" className="investigation-progress__close" onClick={closeProgress} aria-label="关闭调查进度">关闭</button>
    </header>

    <div className="investigation-progress__body">
      <section className="investigation-progress__current" aria-labelledby="investigation-progress-current-title">
        <h3 id="investigation-progress-current-title">当前目标</h3>
        <p>{model.currentObjective}</p>
        <h3>下一步</h3>
        <p id="investigation-progress-next-action" className="investigation-progress__next-action">{model.nextAction}</p>
        {onOpenApp && <button type="button" className="investigation-progress__open-app" onClick={() => {
          closeProgress();
          onOpenApp('notepad');
        }}>打开调查</button>}
      </section>

      <section className="investigation-progress__route" aria-labelledby="investigation-progress-route-title">
        <h3 id="investigation-progress-route-title">已知路线</h3>
        <ol>
          {model.route.map((node) => <li key={node.id} className={`investigation-progress__route-node investigation-progress__route-node--${node.status}`}>
            <span className="investigation-progress__route-status">{statusLabel[node.status]}</span>
            <span className="investigation-progress__route-copy"><strong>{node.label}</strong>{node.detail && <small>{node.detail}</small>}</span>
          </li>)}
        </ol>
      </section>

      <section className="investigation-progress__directions" aria-labelledby="investigation-progress-directions-title">
        <h3 id="investigation-progress-directions-title">已出现的待查方向</h3>
        <ul>{model.pendingDirections.map((direction) => <li key={direction}>{direction}</li>)}</ul>
      </section>

      <details className="investigation-progress__facts">
        <summary>已知材料与记录（{model.knownFacts.length}）</summary>
        {model.knownFacts.length
          ? <ul>{model.knownFacts.map((fact) => <li key={fact.id}>
            <div className="investigation-progress__fact-heading"><strong>{fact.title}</strong><span>{factStatusLabel[fact.status]}</span></div>
            <small>{fact.source}</small>
            <p>{fact.summary}</p>
          </li>)}</ul>
          : <p className="investigation-progress__empty">目前还没有已读材料或现场观察。</p>}
      </details>
    </div>
  </dialog>;
}
