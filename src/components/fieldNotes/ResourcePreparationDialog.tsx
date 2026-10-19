import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { StartupGroup } from '../../startup/preload';
import type { StartupGroupReadiness } from '../../startup/groupReadiness';
import './fieldNotes.css';

export function ResourcePreparationDialog({
  readiness,
  groups,
  title,
  error,
  onRetry,
  onCancel,
}: {
  readiness: StartupGroupReadiness;
  groups: readonly StartupGroup[];
  title: string;
  error: string;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const subscribe = (listener: () => void) => readiness.subscribe(listener);
  const getSnapshot = () => readiness.getSnapshotForGroups(groups);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      if (!dialogRef.current?.contains(document.activeElement) && document.activeElement === document.body && previousActive?.isConnected) previousActive.focus();
    };
  }, []);

  useEffect(() => {
    if (error) retryRef.current?.focus();
  }, [error]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key !== 'Tab') return;
    event.stopPropagation();
    const first = error ? retryRef.current : cancelRef.current;
    const last = cancelRef.current;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  return createPortal(<div className="field-resource-wait__backdrop">
    <section ref={dialogRef} className="field-resource-wait" role="dialog" aria-modal="true" aria-labelledby="field-resource-wait-title" aria-describedby="field-resource-wait-copy" aria-busy={!error} onKeyDown={onKeyDown}>
      <p className="field-resource-wait__eyebrow">田野调查册 · 资源准备</p>
      <h2 id="field-resource-wait-title">{title}</h2>
      <p id="field-resource-wait-copy">进入前会先校验这一幕及共享资源。等待期间，当前调查与进度保持原样。</p>
      <progress aria-label={`${title}进度`} max={Math.max(1, snapshot.totalBytes)} value={snapshot.loadedBytes} />
      <p className="field-resource-wait__stats" role="status">
        {(snapshot.loadedBytes / 1_000_000).toFixed(2)} / {(snapshot.totalBytes / 1_000_000).toFixed(2)} MB
        <span>·</span>{(snapshot.bytesPerSecond / 1000).toFixed(1)} KB/s
        <span>·</span>{snapshot.completed}/{snapshot.total} 项已校验
      </p>
      {error && <p className="field-resource-wait__error" role="alert">{error}</p>}
      <div className="field-resource-wait__actions">
        {error && <button ref={retryRef} type="button" onClick={onRetry}>重试准备</button>}
        <button ref={cancelRef} type="button" onClick={onCancel}>取消等待</button>
      </div>
    </section>
  </div>, document.body);
}
