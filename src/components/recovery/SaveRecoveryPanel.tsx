import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { SaveRecoveryActionResult, SaveRecoveryState, StateManager } from '../../core/stateManager';
import { downloadSaveText } from './saveFile';
import './recovery.css';

function dateStamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function failureCopy(reason: string): string {
  if (reason === 'backup-not-found') return '没有找到可用的最近备份，原记录仍保留。';
  if (reason === 'recovery-slot-occupied') return '设备上已保留另一条原始记录副本。先分别导出两条记录，再确认替换旧副本。';
  if (reason === 'device-save-available') return '发现设备上已有一份调查记录；本次临时记录仍保留，请选择要继续使用的记录。';
  if (reason === 'device-save-changed') return '设备上的调查记录刚刚发生变化；本次临时记录仍保留，请检查后重新确认。';
  if (reason === 'recovery-protection-failed') return '无法保护原始记录，主存档没有更改。请释放浏览器存储空间后重试。';
  if (reason === 'backup-unavailable') return '无法写入有效备份，主存档没有更改。请释放浏览器存储空间后重试。';
  if (reason === 'recovery-required') return '原存档仍需要处理，当前操作没有更改主存档。';
  return '这台设备暂时无法读取或保存调查记录，主存档没有更改。';
}

function recoveryTitle(state: SaveRecoveryState): string {
  if (state.kind === 'corrupt') return '调查记录无法读取';
  if (state.kind === 'unsupported-version') return `调查记录版本 ${state.version} 暂不支持`;
  if (state.kind === 'device-save-available') return '发现设备上已有调查记录';
  if (state.kind === 'backup-only') return '找到一份最近的有效备份';
  if (state.kind === 'unavailable') return '暂时无法访问调查记录';
  return '调查记录状态正常';
}

export interface SaveRecoveryPanelProps {
  manager: StateManager;
  onContinue?: () => void;
  onReplaceProtectedOriginalChange?: (allowed: boolean) => void;
}

export function SaveRecoveryPanel({ manager, onContinue, onReplaceProtectedOriginalChange }: SaveRecoveryPanelProps) {
  const recovery = useSyncExternalStore(manager.subscribeRecoveryState, manager.getRecoveryState, manager.getRecoveryState);
  const [feedback, setFeedback] = useState('');
  const [restartConfirmation, setRestartConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState<'backup' | 'restart' | 'refresh' | 'adopt-device' | null>(null);
  const [exportedCurrent, setExportedCurrent] = useState(false);
  const [exportedProtected, setExportedProtected] = useState(false);
  const [replaceAcknowledged, setReplaceAcknowledged] = useState(false);
  const recoverySignature = JSON.stringify(recovery.kind === 'corrupt' || recovery.kind === 'unsupported-version'
    ? [recovery.kind, recovery.originalText, recovery.kind === 'unsupported-version' ? recovery.version : null, recovery.backupAvailable, recovery.protectedOriginalText]
    : recovery.kind === 'device-save-available'
      ? [recovery.kind, recovery.savedSaveText, recovery.originalText ?? null, recovery.backupAvailable, recovery.protectedOriginalText]
    : recovery.kind === 'unavailable'
      ? [recovery.kind, recovery.originalText ?? null, recovery.backupAvailable, recovery.protectedOriginalText]
      : recovery.kind === 'backup-only' ? [recovery.kind, recovery.protectedOriginalText] : [recovery.kind]);
  const previousRecoverySignature = useRef(recoverySignature);

  useEffect(() => {
    if (previousRecoverySignature.current === recoverySignature) return;
    previousRecoverySignature.current = recoverySignature;
    setPendingAction(null);
    setRestartConfirmation(false);
    setExportedCurrent(false);
    setExportedProtected(false);
    setReplaceAcknowledged(false);
    onReplaceProtectedOriginalChange?.(false);
  }, [recoverySignature, onReplaceProtectedOriginalChange]);

  const protectedText = ('protectedOriginalText' in recovery ? recovery.protectedOriginalText : null)
    ?? manager.exportProtectedOriginalSave();
  const exportText = (serialized: string | null | undefined, fileName: string, which: 'current' | 'protected' | 'device' | 'temporary') => {
    if (typeof serialized !== 'string') {
      setFeedback('无法读取需要导出的记录。');
      return;
    }
    if (!downloadSaveText(serialized, fileName)) {
      setFeedback('暂时无法开始下载，请稍后再试。');
      return;
    }
    if (which === 'current' || which === 'temporary') setExportedCurrent(true);
    else if (which === 'protected') setExportedProtected(true);
    setFeedback('记录副本已开始下载。');
  };

  if (recovery.kind === 'none') {
    if (protectedText === null) return null;
    return <section className="save-recovery-panel" aria-labelledby="save-recovery-title">
      <h3 id="save-recovery-title">已保护一份原始调查记录</h3>
      <p>这是最近一次恢复前保存的异常原文。它会留在设备中，直到被新的保护副本替换。</p>
      <button type="button" onClick={() => exportText(protectedText, `暗潮-已保护原始记录-${dateStamp(new Date())}.json`, 'protected')}>
        导出已保护原始记录
      </button>
      {feedback && <p className="save-recovery-panel__feedback" role="status" aria-live="polite">{feedback}</p>}
    </section>;
  }

  const originalText = recovery.kind === 'corrupt' || recovery.kind === 'unsupported-version' || recovery.kind === 'device-save-available'
    ? recovery.originalText
    : recovery.kind === 'unavailable' ? recovery.originalText : undefined;
  const protectionConflict = typeof originalText === 'string' && typeof protectedText === 'string' && originalText !== protectedText;
  const canReplaceProtected = !protectionConflict || (exportedCurrent && exportedProtected && replaceAcknowledged);
  const stamp = dateStamp(new Date());

  const finishAction = (action: 'backup' | 'restart' | 'refresh' | 'adopt-device', replaceProtectedOriginal = false) => {
    const result: SaveRecoveryActionResult = action === 'backup'
      ? manager.restoreSaveBackup({ replaceProtectedOriginal })
      : action === 'restart'
        ? manager.restartFromRecovery({ replaceProtectedOriginal })
        : action === 'refresh'
          ? manager.refreshSaveRecovery({ replaceProtectedOriginal })
          : manager.adoptAvailableSave({ replaceProtectedOriginal });
    if (result.ok) {
      setFeedback(action === 'backup' ? '最近的有效备份已恢复。'
        : action === 'restart' ? '已重新开始；原始记录副本仍保留在设备上。'
          : action === 'refresh' ? '本次记录已保存到设备。'
            : '已切换到设备上现有的调查记录。');
      setPendingAction(null);
      setRestartConfirmation(false);
      return;
    }
    if (result.reason === 'device-save-available') {
      setPendingAction(null);
      setFeedback(failureCopy(result.reason));
      return;
    }
    setPendingAction(action);
    setFeedback(failureCopy(result.reason));
  };

  return <section className="save-recovery-panel" aria-labelledby="save-recovery-title">
    <h3 id="save-recovery-title">{recoveryTitle(recovery)}</h3>
    {recovery.kind === 'corrupt' && <p>原始内容无法解析。它会留在设备中，直到你导出或选择恢复方式。</p>}
    {recovery.kind === 'unsupported-version' && <p>这个记录使用当前版本无法读取的存档格式。原始内容会留在设备中。</p>}
    {recovery.kind === 'unavailable' && <p>当前操作只在本次打开期间保留。重新读取存储，或稍后重试恢复。</p>}
    {recovery.kind === 'backup-only' && <p>主记录为空；恢复前不会把新操作写入设备。</p>}
    {recovery.kind === 'device-save-available' && <p>本次临时记录仍保留在当前窗口中。请先比较或导出两份记录，再选择继续本次进度或使用设备上的调查记录。</p>}

    <div className="save-recovery-panel__actions">
      {originalText !== undefined && <button type="button" onClick={() => exportText(originalText, `暗潮-原始调查记录-${stamp}.json`, 'current')}>导出当前原始记录</button>}
      {recovery.kind === 'device-save-available' && <>
        <button type="button" onClick={() => exportText(manager.exportSave(), `暗潮-本次临时调查记录-${stamp}.json`, 'temporary')}>导出本次临时记录</button>
        <button type="button" onClick={() => exportText(recovery.savedSaveText, `暗潮-设备已保存记录-${stamp}.json`, 'device')}>导出设备上的记录</button>
        <button type="button" onClick={() => setPendingAction('adopt-device')}>使用设备上的记录…</button>
      </>}
      {protectedText !== null && <button type="button" onClick={() => exportText(manager.exportProtectedOriginalSave(), `暗潮-已保护原始记录-${stamp}.json`, 'protected')}>导出先前保护记录</button>}
      {'backupAvailable' in recovery && recovery.backupAvailable && <button type="button" onClick={() => finishAction('backup')}>恢复最近的有效备份</button>}
      {recovery.kind === 'unavailable' && <button type="button" onClick={() => {
        const result = manager.refreshSaveRecovery();
        if (result.ok) {
          setFeedback('本次记录已保存到设备。');
        } else {
          if (result.reason === 'recovery-slot-occupied' || result.reason === 'recovery-protection-failed') setPendingAction('refresh');
          setFeedback(failureCopy(result.reason));
        }
      }}>重新读取存储</button>}
      {!restartConfirmation && <button type="button" onClick={() => setRestartConfirmation(true)}>明确重新开始…</button>}
      {onContinue && <button type="button" onClick={onContinue}>继续临时游玩</button>}
    </div>

    {restartConfirmation && <div className="save-recovery-panel__confirmation" role="group" aria-label="确认重新开始">
      <p>重新开始会把设备上的主存档替换为新记录。当前异常原文会先另存一份；若保存失败，主存档不会更改。</p>
      <button type="button" onClick={() => finishAction('restart')}>确认重新开始</button>
      <button type="button" onClick={() => setRestartConfirmation(false)}>继续保留原记录</button>
    </div>}

    {recovery.kind === 'device-save-available' && pendingAction === 'adopt-device' && !protectionConflict && <div className="save-recovery-panel__confirmation" role="group" aria-label="确认使用设备记录">
      <p>使用设备上的记录会替换本次窗口中的临时状态。临时记录仍可先导出；确认后页面会同步切换到设备记录。</p>
      <button type="button" onClick={() => finishAction('adopt-device')}>确认使用设备记录</button>
      <button type="button" onClick={() => setPendingAction(null)}>继续本次临时记录</button>
    </div>}

    {protectionConflict && <div className="save-recovery-panel__confirmation" role="group" aria-label="替换已有保护副本">
      <p>设备上已保留另一条原始记录副本。请先分别开始下载当前异常记录和已保留记录，再明确允许替换旧副本。</p>
      <label>
        <input type="checkbox" checked={replaceAcknowledged} disabled={!exportedCurrent || !exportedProtected} onChange={(event) => {
          setReplaceAcknowledged(event.currentTarget.checked);
          onReplaceProtectedOriginalChange?.(event.currentTarget.checked);
        }} />
        我已分别导出两条原始记录，并允许替换旧保护副本
      </label>
      {pendingAction && <button type="button" disabled={!canReplaceProtected} onClick={() => finishAction(pendingAction, true)}>
        {pendingAction === 'backup' ? '继续恢复备份并替换旧副本'
          : pendingAction === 'restart' ? '继续重新开始并替换旧副本'
            : pendingAction === 'refresh' ? '继续保存本次记录并替换旧副本'
              : '继续使用设备记录并替换旧副本'}
      </button>}
    </div>}

    {feedback && <p className="save-recovery-panel__feedback" role="status" aria-live="polite">{feedback}</p>}
  </section>;
}
