import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { emptyChapterHistory, readChapterHistory, writeChapterHistory } from '../../core/persistence/chapterHistory';
import type { BrowserStoragePort } from '../../core/persistence/browserStorage';
import { SAVE_KEY, writeSaveState } from '../../core/saveManager';
import { StateManager } from '../../core/stateManager';
import { sha256, type StartupManifest, type StartupResource } from '../../startup/preload';
import { StartupGroupReadiness } from '../../startup/groupReadiness';
import { ChapterNavigation } from './ChapterNavigation';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class MemoryStorage implements BrowserStoragePort {
  values = new Map<string, string>();
  failSaveWrite = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (key === SAVE_KEY && this.failSaveWrite) throw new Error('write blocked');
    this.values.set(key, value);
  }
  removeItem(key: string) { this.values.delete(key); }
}

describe('ChapterNavigation', () => {
  let container: HTMLDivElement;
  let root: Root;
  let storage: MemoryStorage;
  let manager: StateManager;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    storage = new MemoryStorage();
    const state = createDefaultState();
    state.game.act = 3;
    state.game.flags = { FLAG_A1_COMPLETE: true, FLAG_A2_COMPLETE: true };
    state.modules.act2Research.stage = 'finale';
    state.modules.act3.stage = 'T00';
    expect(writeSaveState(state, storage).ok).toBe(true);
    expect(writeChapterHistory({ ...emptyChapterHistory(), unlockedThrough: 3 }, storage)).toBe(true);
    manager = new StateManager(new EventBus(), undefined, storage);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  const render = async (props: Partial<React.ComponentProps<typeof ChapterNavigation>> = {}) => {
    await act(async () => { root.render(<ChapterNavigation manager={manager} {...props} />); });
  };
  const button = (selector: string) => {
    const element = document.querySelector<HTMLButtonElement>(selector);
    expect(element, `missing ${selector}`).not.toBeNull();
    return element!;
  };

  it('shows only reached chapters, and cancel leaves the save unchanged and returns focus to the choice', async () => {
    await render();
    await act(async () => { button('.chapter-navigation__trigger').click(); });
    expect([...document.querySelectorAll<HTMLButtonElement>('.chapter-navigation__choice')].map((item) => item.disabled)).toEqual([false, false, false, true]);
    const before = manager.exportSave();
    const firstChoice = button('.chapter-navigation__choice');
    await act(async () => { firstChoice.click(); });
    expect(document.querySelector('.chapter-navigation__confirmation[role="dialog"]')).not.toBeNull();
    expect(document.activeElement).toBe(button('.chapter-navigation__confirmation-actions button:first-child'));
    await act(async () => { button('.chapter-navigation__confirmation-actions button:first-child').click(); });
    expect(manager.exportSave()).toBe(before);
    expect(document.activeElement).toBe(firstChoice);
  });

  it('waits for an unlocked chapter before opening replay confirmation and lets the player cancel that wait', async () => {
    const shared = new TextEncoder().encode('shared');
    const chapter = new TextEncoder().encode('chapter three resource');
    const sharedResource: StartupResource = { path: 'assets/shared.webp', bytes: shared.length, sha256: await sha256(shared), groups: ['shared'] };
    const chapterResource: StartupResource = { path: 'assets/act3.webp', bytes: chapter.length, sha256: await sha256(chapter), groups: ['act3'] };
    const manifest: StartupManifest = {
      schema: 2, version: 'a'.repeat(64), base: '/AnChao/', totalBytes: shared.length + chapter.length,
      groups: {
        shared: { resources: 1, totalBytes: shared.length }, act1: { resources: 0, totalBytes: 0 },
        act2: { resources: 0, totalBytes: 0 }, act3: { resources: 1, totalBytes: chapter.length }, act4: { resources: 0, totalBytes: 0 },
      }, resources: [sharedResource, chapterResource],
    };
    let startFetch!: () => void;
    const started = new Promise<void>((resolve) => { startFetch = resolve; });
    let releaseResponse!: (response: Response) => void;
    const fetcher = vi.fn(async () => {
      startFetch();
      return new Promise<Response>((resolve) => { releaseResponse = resolve; });
    }) as unknown as typeof fetch;
    const readiness = new StartupGroupReadiness({
      manifest, base: new URL('https://example.test/AnChao/'), initialResources: [sharedResource], fetcher,
    });
    const before = manager.exportSave();
    await render({ readiness });
    await act(async () => { button('.chapter-navigation__trigger').click(); });
    await act(async () => { button('.chapter-navigation__choice:nth-child(3)').click(); });
    await act(async () => { await started; });
    expect(document.querySelector('.chapter-navigation__wait')?.textContent).toContain('正在准备第3幕资源');
    expect(document.querySelector('.chapter-navigation__confirmation[role="dialog"]')).toBeNull();
    await act(async () => { button('.chapter-navigation__wait-actions button:last-child').click(); });
    releaseResponse(new Response(chapter));
    await vi.waitFor(() => expect(readiness.getSnapshot(3).state).toBe('ready'));
    expect(document.querySelector('.chapter-navigation__wait')).toBeNull();
    expect(document.querySelector('.chapter-navigation__confirmation[role="dialog"]')).toBeNull();
    expect(manager.exportSave()).toBe(before);
  });

  it('invalidates a pending chapter wait when the menu closes, Escape is pressed, or the component unmounts', async () => {
    const shared = new TextEncoder().encode('shared');
    const chapter = new TextEncoder().encode('chapter three resource');
    const sharedResource: StartupResource = { path: 'assets/shared.webp', bytes: shared.length, sha256: await sha256(shared), groups: ['shared'] };
    const chapterResource: StartupResource = { path: 'assets/act3.webp', bytes: chapter.length, sha256: await sha256(chapter), groups: ['act3'] };
    const manifest: StartupManifest = {
      schema: 2, version: 'a'.repeat(64), base: '/AnChao/', totalBytes: shared.length + chapter.length,
      groups: {
        shared: { resources: 1, totalBytes: shared.length }, act1: { resources: 0, totalBytes: 0 },
        act2: { resources: 0, totalBytes: 0 }, act3: { resources: 1, totalBytes: chapter.length }, act4: { resources: 0, totalBytes: 0 },
      }, resources: [sharedResource, chapterResource],
    };
    let startFetch!: () => void;
    const started = new Promise<void>((resolve) => { startFetch = resolve; });
    let releaseResponse!: (response: Response) => void;
    const readiness = new StartupGroupReadiness({
      manifest, base: new URL('https://example.test/AnChao/'), initialResources: [sharedResource],
      fetcher: (async () => { startFetch(); return new Promise<Response>((resolve) => { releaseResponse = resolve; }); }) as unknown as typeof fetch,
    });
    await render({ readiness });
    const beginAct3Wait = async () => {
      await act(async () => { button('.chapter-navigation__trigger').click(); });
      await act(async () => { button('.chapter-navigation__choice:nth-child(3)').click(); });
      await act(async () => { await started; });
      expect(document.querySelector('.chapter-navigation__wait')).not.toBeNull();
    };

    await beginAct3Wait();
    await act(async () => { button('.chapter-navigation__close').click(); });
    expect(document.querySelector('.chapter-navigation__wait')).toBeNull();
    await beginAct3Wait();
    await act(async () => { document.querySelector<HTMLElement>('#chapter-navigation-menu')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(document.querySelector('.chapter-navigation__wait')).toBeNull();
    await beginAct3Wait();
    await act(async () => { root.unmount(); });
    releaseResponse(new Response(chapter));
    await vi.waitFor(() => expect(readiness.getSnapshot(3).state).toBe('ready'));
    expect(document.querySelector('.chapter-navigation__confirmation[role="dialog"]')).toBeNull();
  });

  it('waits for shared plus both first-act groups before showing the clear-progress confirmation', async () => {
    const shared = new TextEncoder().encode('shared');
    const act1 = new TextEncoder().encode('first act');
    const act2 = new TextEncoder().encode('second act');
    const sharedResource: StartupResource = { path: 'assets/shared.webp', bytes: shared.length, sha256: await sha256(shared), groups: ['shared'] };
    const act1Resource: StartupResource = { path: 'assets/act1.webp', bytes: act1.length, sha256: await sha256(act1), groups: ['act1'] };
    const act2Resource: StartupResource = { path: 'assets/act2.webp', bytes: act2.length, sha256: await sha256(act2), groups: ['act2'] };
    const manifest: StartupManifest = {
      schema: 2, version: 'a'.repeat(64), base: '/AnChao/', totalBytes: shared.length + act1.length + act2.length,
      groups: {
        shared: { resources: 1, totalBytes: shared.length }, act1: { resources: 1, totalBytes: act1.length },
        act2: { resources: 1, totalBytes: act2.length }, act3: { resources: 0, totalBytes: 0 }, act4: { resources: 0, totalBytes: 0 },
      }, resources: [sharedResource, act1Resource, act2Resource],
    };
    const releaseResponse = new Map<string, (response: Response) => void>();
    const readiness = new StartupGroupReadiness({
      manifest, base: new URL('https://example.test/AnChao/'), initialResources: [sharedResource],
      fetcher: (async (url: string) => {
        const path = new URL(url).pathname.split('/').pop()!;
        return new Promise<Response>((resolve) => { releaseResponse.set(path, resolve); });
      }) as unknown as typeof fetch,
    });
    const before = manager.exportSave();
    await render({ readiness });
    await act(async () => { button('.chapter-navigation__trigger').click(); });
    await act(async () => { document.querySelector<HTMLDetailsElement>('.chapter-navigation__other')!.querySelector('summary')!.click(); });
    await act(async () => { button('.chapter-navigation__clear').click(); });
    expect(document.querySelector('.chapter-navigation__wait')?.textContent).toContain('新游戏的第一、二幕资源');
    expect(document.querySelector('.chapter-navigation__confirmation[role="dialog"]')).toBeNull();
    expect(manager.exportSave()).toBe(before);
    await vi.waitFor(() => expect(releaseResponse.size).toBe(2));
    releaseResponse.get('act1.webp')!(new Response(act1));
    await vi.waitFor(() => expect(document.querySelector('.chapter-navigation__confirmation[role="dialog"]')).toBeNull());
    releaseResponse.get('act2.webp')!(new Response(act2));
    await vi.waitFor(() => expect(document.querySelector('.chapter-navigation__confirmation[role="dialog"]')).not.toBeNull());
    expect(manager.exportSave()).toBe(before);
  });

  it('uses the requested placement class so taskbar and fullscreen entries share the same access behavior', async () => {
    await render({ placement: 'taskbar' });
    expect(document.querySelector('.chapter-navigation--taskbar .chapter-navigation__trigger')).not.toBeNull();
    await render({ placement: 'header' });
    expect(document.querySelector('.chapter-navigation--header .chapter-navigation__trigger')).not.toBeNull();
    await render({ placement: 'scene' });
    expect(document.querySelector('.chapter-navigation--scene .chapter-navigation__trigger')).not.toBeNull();
    await render({ placement: 'ending' });
    expect(document.querySelector('.chapter-navigation--ending .chapter-navigation__trigger')).not.toBeNull();
  });

  it('renders both centered layers outside the filtered taskbar and traps focus only in the top layer', async () => {
    await act(async () => { root.render(<footer style={{ backdropFilter: 'blur(16px)' }}><ChapterNavigation manager={manager} placement="taskbar" /></footer>); });
    const trigger = button('.chapter-navigation__trigger');
    await act(async () => { trigger.click(); });
    const menu = document.querySelector<HTMLElement>('#chapter-navigation-menu')!;
    expect(menu.parentElement?.parentElement).toBe(document.body);
    expect(container.contains(menu)).toBe(false);
    const close = button('.chapter-navigation__close');
    expect(document.activeElement).toBe(close);
    await act(async () => { close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })); });
    expect(document.activeElement).toBe(document.querySelector('.chapter-navigation__other summary'));
    await act(async () => { document.querySelector<HTMLDetailsElement>('.chapter-navigation__other')!.querySelector('summary')!.click(); });
    const clear = button('.chapter-navigation__clear');
    await act(async () => { clear.click(); });
    expect(menu.parentElement?.hasAttribute('inert')).toBe(true);
    const dialog = document.querySelector<HTMLElement>('.chapter-navigation__confirmation')!;
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    const cancel = button('.chapter-navigation__confirmation-actions button:first-child');
    const confirm = button('.chapter-navigation__confirmation-actions button:last-child');
    await act(async () => { cancel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })); });
    expect(document.activeElement).toBe(confirm);
    await act(async () => { confirm.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })); });
    expect(document.activeElement).toBe(cancel);
    await act(async () => { dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(menu.parentElement?.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(clear);
    await act(async () => { menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(document.querySelector('#chapter-navigation-menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('exposes accessible music controls in the centered menu and keeps the volume range in its keyboard flow', async () => {
    await render();
    const trigger = button('.chapter-navigation__trigger');
    await act(async () => { trigger.click(); });
    const toggle = button('.chapter-navigation__music-toggle');
    const range = document.querySelector<HTMLInputElement>('#chapter-navigation-music-volume')!;
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(range.type).toBe('range');
    expect(range.getAttribute('aria-label')).toBe('背景音乐音量');
    expect(range.value).toBe('20');

    range.focus();
    expect(document.activeElement).toBe(range);
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    await act(async () => { range.dispatchEvent(tab); });
    expect(tab.defaultPrevented).toBe(false);
    await act(async () => { range.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(document.querySelector('#chapter-navigation-menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps reset hidden under the collapsed other-options disclosure and uses the default-cancel confirmation', async () => {
    await render();
    await act(async () => { button('.chapter-navigation__trigger').click(); });
    const details = document.querySelector<HTMLDetailsElement>('.chapter-navigation__other')!;
    expect(details.open).toBe(false);
    expect(details.querySelector('.chapter-navigation__clear')).not.toBeNull();
    await act(async () => { details.querySelector('summary')!.click(); });
    const clear = button('.chapter-navigation__clear');
    const before = manager.exportSave();
    await act(async () => { clear.click(); });
    expect(document.activeElement).toBe(button('.chapter-navigation__confirmation-actions button:first-child'));
    expect(document.querySelector('.chapter-navigation__confirmation[role="dialog"]')?.textContent).toContain('手写笔记');
    await act(async () => { button('.chapter-navigation__confirmation-actions button:first-child').click(); });
    expect(manager.exportSave()).toBe(before);
    expect(document.activeElement).toBe(clear);
  });

  it('does not bubble Escape or Tab into a parent modal and restores focus when Escape cancels', async () => {
    const parentKeyHandler = vi.fn();
    await act(async () => { root.render(<div onKeyDown={parentKeyHandler}><ChapterNavigation manager={manager} /></div>); });
    await act(async () => { button('.chapter-navigation__trigger').click(); });
    const choice = button('.chapter-navigation__choice');
    await act(async () => { choice.click(); });
    const dialog = document.querySelector<HTMLDivElement>('.chapter-navigation__confirmation[role="dialog"]')!;
    parentKeyHandler.mockClear();
    await act(async () => { dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(parentKeyHandler).not.toHaveBeenCalled();
    expect(document.querySelector('.chapter-navigation__confirmation[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(choice);
    parentKeyHandler.mockClear();
    await act(async () => { choice.click(); });
    const nestedDialog = document.querySelector<HTMLDivElement>('.chapter-navigation__confirmation[role="dialog"]')!;
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    await act(async () => { nestedDialog.dispatchEvent(tab); });
    expect(parentKeyHandler).not.toHaveBeenCalled();
    parentKeyHandler.mockClear();
    await act(async () => { nestedDialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(document.querySelector('.chapter-navigation__confirmation[role="dialog"]')).toBeNull();
    const menu = document.querySelector<HTMLElement>('#chapter-navigation-menu')!;
    await act(async () => { menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(parentKeyHandler).not.toHaveBeenCalled();
    expect(document.querySelector('#chapter-navigation-menu')).toBeNull();
    expect(document.activeElement).toBe(button('.chapter-navigation__trigger'));
  });

  it('keeps the visible current chapter on screen when a replay save fails', async () => {
    storage.failSaveWrite = true;
    await render();
    await act(async () => { button('.chapter-navigation__trigger').click(); });
    await act(async () => { button('.chapter-navigation__choice').click(); });
    await act(async () => { button('.chapter-navigation__confirmation-actions button:last-child').click(); });
    expect(manager.getState().game.act).toBe(3);
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('当前进度没有改变');
    expect(document.querySelector('.chapter-navigation__confirmation[role="dialog"]')).not.toBeNull();
  });

  it('keeps the current chapter and unlock history when clearing progress cannot save', async () => {
    storage.failSaveWrite = true;
    await render();
    await act(async () => { button('.chapter-navigation__trigger').click(); });
    await act(async () => { document.querySelector<HTMLDetailsElement>('.chapter-navigation__other')!.querySelector('summary')!.click(); });
    await act(async () => { button('.chapter-navigation__clear').click(); });
    await act(async () => { button('.chapter-navigation__confirmation-actions button:last-child').click(); });

    expect(manager.getState().game.act).toBe(3);
    expect(readChapterHistory(storage).history.unlockedThrough).toBe(3);
    expect(document.querySelector('.chapter-navigation__confirmation[role="dialog"]')).not.toBeNull();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('清零未完成');
  });
});
