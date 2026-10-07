import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { SAVE_KEY, SAVE_RECOVERY_KEY } from '../../core/saveManager';
import { StateManager } from '../../core/stateManager';
import type { SaveStoragePort } from '../../core/persistence/browserStorage';
import { SettingsPanel } from '../../modules/settings/SettingsPanel';

function memoryStorage(): SaveStoragePort {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, String(value)); },
    removeItem: (key) => { values.delete(key); },
  };
}

async function selectFile(input: HTMLInputElement, contents: string, name: string): Promise<void> {
  const file = new File([contents], name, { type: 'application/json' });
  Object.defineProperty(file, 'text', { configurable: true, value: () => Promise.resolve(contents) });
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();
  });
}

describe('SettingsPanel protected save import', () => {
  let root: ReturnType<typeof createRoot> | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    vi.restoreAllMocks();
  });

  it('requires a fresh explicit retry after selecting a new file following a prior replacement acknowledgement', async () => {
    const storage = memoryStorage();
    const currentOriginal = '{current broken original';
    const previousProtected = '{previous protected original';
    storage.setItem(SAVE_KEY, currentOriginal);
    storage.setItem(SAVE_RECOVERY_KEY, previousProtected);
    const manager = new StateManager(new EventBus(), undefined, storage);
    const importSave = vi.spyOn(manager, 'importSave');
    const imported = JSON.stringify(createDefaultState());
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:settings-save-test');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(createElement(SettingsPanel, { manager })));
    const fileInput = container.querySelector<HTMLInputElement>('#settings-save-file')!;

    await selectFile(fileInput, imported, 'first.json');
    expect(importSave).toHaveBeenNthCalledWith(1, imported, { replaceProtectedOriginal: false });
    expect(container.textContent).toContain('请先在恢复选项中分别导出两条原文');

    const exportCurrent = [...container.querySelectorAll('button')].find((button) => button.textContent === '导出当前原始记录') as HTMLButtonElement;
    const exportProtected = [...container.querySelectorAll('button')].find((button) => button.textContent === '导出先前保护记录') as HTMLButtonElement;
    act(() => exportCurrent.click());
    act(() => exportProtected.click());
    const acknowledge = container.querySelector<HTMLInputElement>('.save-recovery-panel__confirmation input[type="checkbox"]')!;
    expect(acknowledge.disabled).toBe(false);
    act(() => acknowledge.click());

    await selectFile(fileInput, imported, 'second.json');
    expect(importSave).toHaveBeenNthCalledWith(2, imported, { replaceProtectedOriginal: false });
    expect(storage.getItem(SAVE_KEY)).toBe(currentOriginal);
    expect(storage.getItem(SAVE_RECOVERY_KEY)).toBe(previousProtected);
    const nextAcknowledgement = container.querySelector<HTMLInputElement>('.save-recovery-panel__confirmation input[type="checkbox"]')!;
    expect(nextAcknowledgement.checked).toBe(false);
    const retryBeforeConfirmation = [...container.querySelectorAll('button')].find((button) => button.textContent === '导入所选记录并替换旧保护副本') as HTMLButtonElement;
    expect(retryBeforeConfirmation.disabled).toBe(true);

    act(() => nextAcknowledgement.click());
    const explicitRetry = [...container.querySelectorAll('button')].find((button) => button.textContent === '导入所选记录并替换旧保护副本') as HTMLButtonElement;
    expect(explicitRetry.disabled).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(currentOriginal);
    expect(storage.getItem(SAVE_RECOVERY_KEY)).toBe(previousProtected);
    act(() => explicitRetry.click());
    expect(importSave).toHaveBeenNthCalledWith(3, imported, { replaceProtectedOriginal: true });
    expect(storage.getItem(SAVE_KEY)).not.toBe(currentOriginal);
    expect(storage.getItem(SAVE_RECOVERY_KEY)).toBe(currentOriginal);
  });
});
