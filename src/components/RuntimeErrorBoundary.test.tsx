import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuntimeErrorBoundary } from './RuntimeErrorBoundary';

describe('RuntimeErrorBoundary', () => {
  let root: ReturnType<typeof createRoot> | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it('shows export and retry actions after a render failure without clearing the child state', () => {
    let shouldThrow = true;
    const exportSave = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Child() {
      if (shouldThrow) throw new Error('render failed');
      return <p>调查界面已恢复</p>;
    }

    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(createElement(RuntimeErrorBoundary, { onExportSave: exportSave, children: createElement(Child) })));
    expect(container.textContent).toContain('界面暂时没有显示出来');
    expect(container.textContent).toContain('导出调查记录');

    const exportButton = [...container.querySelectorAll('button')].find((button) => button.textContent === '导出调查记录') as HTMLButtonElement;
    act(() => exportButton.click());
    expect(exportSave).toHaveBeenCalledOnce();

    shouldThrow = false;
    const retryButton = [...container.querySelectorAll('button')].find((button) => button.textContent === '重新尝试') as HTMLButtonElement;
    act(() => retryButton.click());
    expect(container.textContent).toContain('调查界面已恢复');
    consoleError.mockRestore();
  });

  it('shows an accessible failure message when exporting the current save fails', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => { throw new Error('download unavailable'); });
    function BrokenChild(): null { throw new Error('render failed'); }

    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(createElement(RuntimeErrorBoundary, { children: createElement(BrokenChild) })));
    const exportButton = [...container.querySelectorAll('button')].find((button) => button.textContent === '导出调查记录') as HTMLButtonElement;
    act(() => exportButton.click());

    expect(container.textContent).toContain('这次界面异常不会清空现有进度');
    expect(container.querySelector('[role="status"]')?.textContent).toContain('暂时无法导出');
    createObjectUrl.mockRestore();
    consoleError.mockRestore();
  });
});
