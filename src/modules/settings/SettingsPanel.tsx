import { useRef, useState, useSyncExternalStore } from 'react';
import type { ChangeEvent } from 'react';
import { getUiPreferences, setReaderFontSize, subscribeUiPreferences, type ReaderFontSize } from '../../core/uiPreferences';
import type { SaveStatus, StateManager } from '../../core/stateManager';
import { SaveRecoveryPanel } from '../../components/recovery/SaveRecoveryPanel';
import { downloadSaveText } from '../../components/recovery/saveFile';
import './settings.css';

const MAX_IMPORT_SIZE_BYTES = 2 * 1024 * 1024;
const READER_FONT_SIZES: ReaderFontSize[] = [18, 20, 22];

const saveStatusCopy: Record<SaveStatus, { title: string; detail: string }> = {
  saved: { title: '已保存', detail: '最近的调查进度已保存在这台设备上。' },
  saving: { title: '正在保存', detail: '稍等片刻，正在记下最近的进展。' },
  unavailable: { title: '暂时无法保存', detail: '你可以继续调查；也可以先导出一份副本留存。' },
  'recovery-required': { title: '需要恢复调查记录', detail: '原记录仍受保护；恢复完成前的新操作只在本次打开期间保留。' },
};

function localDateStamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export interface SettingsPanelProps {
  manager: StateManager;
  onClose?: () => void;
}

/** Player-facing reading and save tools. The caller supplies the active save manager. */
export function SettingsPanel({ manager, onClose }: SettingsPanelProps) {
  const saveStatus = useSyncExternalStore(manager.subscribeSaveStatus, manager.getSaveStatus, manager.getSaveStatus);
  const preferences = useSyncExternalStore(subscribeUiPreferences, getUiPreferences, getUiPreferences);
  const [fontFeedback, setFontFeedback] = useState('');
  const [exportFeedback, setExportFeedback] = useState('');
  const [importFeedback, setImportFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImportText, setPendingImportText] = useState<string | null>(null);
  const [replaceProtectedOriginal, setReplaceProtectedOriginal] = useState(false);
  const isImportingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const changeReaderFontSize = (size: ReaderFontSize) => {
    const persisted = setReaderFontSize(size);
    setFontFeedback(persisted
      ? `阅读字号已调整为 ${size}px 并保存。`
      : `阅读字号已调整为 ${size}px；本次已生效，但未能保存到下次。`);
  };

  const exportLatestSave = () => {
    const saveText = manager.exportSave();
    setExportFeedback(downloadSaveText(saveText, `暗潮-调查记录-${localDateStamp(new Date())}.json`)
      ? '调查记录副本已开始下载。'
      : '暂时无法导出调查记录，请稍后再试。');
  };

  const importSaveFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file || isImportingRef.current) return;
    setImportFeedback(null);
    setPendingImportText(null);
    setReplaceProtectedOriginal(false);
    if (file.size > MAX_IMPORT_SIZE_BYTES) {
      setImportFeedback({ kind: 'error', text: '这个文件超过 2 MiB，未导入；请选择较小的调查记录副本。' });
      return;
    }

    isImportingRef.current = true;
    setIsImporting(true);
    try {
      const serialized = await file.text();
      const result = manager.importSave(serialized, { replaceProtectedOriginal });
      if (result.ok) {
        setPendingImportText(null);
        setReplaceProtectedOriginal(false);
        setImportFeedback({ kind: 'success', text: '调查记录已恢复并保存到这台设备。' });
      } else if (result.reason === 'recovery-slot-occupied') {
        setPendingImportText(serialized);
        setImportFeedback({ kind: 'error', text: '这个文件有效，但设备上已保留另一条原始记录副本。请先在恢复选项中分别导出两条原文，再明确允许替换旧副本。' });
      } else if (result.reason === 'storage-unavailable' || result.reason === 'backup-unavailable' || result.reason === 'recovery-protection-failed') {
        setPendingImportText(null);
        setImportFeedback({ kind: 'error', text: '这台设备暂时无法保存；原有调查记录没有更改。' });
      } else {
        setPendingImportText(null);
        setImportFeedback({ kind: 'error', text: '这个文件无法用于恢复调查记录；原有记录没有更改。' });
      }
    } catch {
      setImportFeedback({ kind: 'error', text: '没能读取这个文件；原有调查记录没有更改。' });
    } finally {
      isImportingRef.current = false;
      setIsImporting(false);
    }
  };

  const retryPendingImport = () => {
    if (!pendingImportText || !replaceProtectedOriginal) return;
    const result = manager.importSave(pendingImportText, { replaceProtectedOriginal: true });
    if (result.ok) {
      setPendingImportText(null);
      setReplaceProtectedOriginal(false);
      setImportFeedback({ kind: 'success', text: '调查记录已恢复并保存到这台设备。原始记录副本仍保留在设备上。' });
    } else {
      setImportFeedback({ kind: 'error', text: result.reason === 'recovery-protection-failed'
        ? '无法保存新的原始记录副本，主存档没有更改。'
        : '调查记录没有更改；请检查设备存储后重试。' });
    }
  };

  const statusCopy = saveStatusCopy[saveStatus];

  return (
    <section className="settings-panel" aria-labelledby="settings-panel-title" aria-busy={isImporting}>
      <header className="settings-panel__header">
        <div>
          <p className="settings-panel__eyebrow">调查工具</p>
          <h2 id="settings-panel-title">设置与存档</h2>
        </div>
        {onClose && <button className="settings-panel__close" type="button" onClick={onClose}>返回调查</button>}
      </header>

      <main className="settings-panel__content">
        <section className="settings-panel__section" aria-labelledby="settings-font-title">
          <h3 id="settings-font-title">阅读字号</h3>
          <p className="settings-panel__description">选择适合自己的文字大小，阅读时会立即生效。</p>
          <div className="settings-panel__font-options" role="group" aria-label="阅读字号">
            {READER_FONT_SIZES.map((size) => <button
              key={size}
              type="button"
              aria-pressed={preferences.readerFontSize === size}
              className={preferences.readerFontSize === size ? 'settings-panel__font-option settings-panel__font-option--selected' : 'settings-panel__font-option'}
              onClick={() => changeReaderFontSize(size)}
            >{size}px</button>)}
          </div>
          {fontFeedback && <p className="settings-panel__feedback" role="status">{fontFeedback}</p>}
        </section>

        <section className="settings-panel__section" aria-labelledby="settings-save-title">
          <h3 id="settings-save-title">调查进度</h3>
          <div className={`settings-panel__save-status settings-panel__save-status--${saveStatus}`} role="status" aria-live="polite">
            <strong>{statusCopy.title}</strong>
            <span>{statusCopy.detail}</span>
          </div>
          <div className="settings-panel__save-actions">
            <button type="button" onClick={exportLatestSave}>导出调查记录</button>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isImporting} aria-controls="settings-save-file">
              {isImporting ? '正在读取…' : '从文件恢复'}
            </button>
            <input
              ref={fileInputRef}
              id="settings-save-file"
              className="settings-panel__file-input"
              type="file"
              accept="application/json,.json"
              aria-label="选择调查记录文件"
              tabIndex={-1}
              onChange={importSaveFile}
            />
          </div>
          <SaveRecoveryPanel manager={manager} onReplaceProtectedOriginalChange={setReplaceProtectedOriginal} />
          {pendingImportText && <button type="button" className="save-recovery-panel__confirm-import" disabled={!replaceProtectedOriginal || isImporting} onClick={retryPendingImport}>
            导入所选记录并替换旧保护副本
          </button>}
          {exportFeedback && <p className="settings-panel__feedback" role="status" aria-live="polite">{exportFeedback}</p>}
          <p className="settings-panel__description">恢复文件最多 2 MiB；导入前会检查内容，无法恢复时原有记录会保留。</p>
          {importFeedback && <p className={`settings-panel__feedback settings-panel__feedback--${importFeedback.kind}`} role="status" aria-live="polite">{importFeedback.text}</p>}
        </section>
      </main>
    </section>
  );
}
