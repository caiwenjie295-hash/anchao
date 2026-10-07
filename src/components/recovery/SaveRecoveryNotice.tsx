import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent } from 'react';
import type { StateManager } from '../../core/stateManager';
import { SaveRecoveryPanel } from './SaveRecoveryPanel';
import './recovery.css';

export function SaveRecoveryNotice({ manager }: { manager: StateManager }) {
  const recovery = useSyncExternalStore(manager.subscribeRecoveryState, manager.getRecoveryState, manager.getRecoveryState);
  const [continued, setContinued] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const reopenRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setContinued(false), [recovery]);
  useEffect(() => {
    if (continued) {
      reopenRef.current?.focus();
      return;
    }
    dialogRef.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
  }, [continued, recovery]);

  const containTabFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') ?? [])];
    if (!focusable.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  };

  if (recovery.kind === 'none') return null;
  if (continued) return <aside className="save-recovery-notice save-recovery-notice--compact" aria-label="调查记录恢复提示">
    <strong>调查记录仍受保护</strong>
    <button ref={reopenRef} type="button" onClick={() => setContinued(false)}>打开恢复选项</button>
  </aside>;
  return <div className="save-recovery-notice" role="presentation">
    <div ref={dialogRef} className="save-recovery-notice__card" role="dialog" aria-modal="true" aria-labelledby="save-recovery-notice-title" aria-describedby="save-recovery-notice-description" tabIndex={-1} onKeyDown={containTabFocus}>
      <h2 id="save-recovery-notice-title">先处理调查记录</h2>
      <p id="save-recovery-notice-description">这次启动没有覆盖原始记录。你可以导出原文、恢复有效备份，或继续临时游玩。</p>
      <SaveRecoveryPanel manager={manager} onContinue={() => setContinued(true)} />
    </div>
  </div>;
}
