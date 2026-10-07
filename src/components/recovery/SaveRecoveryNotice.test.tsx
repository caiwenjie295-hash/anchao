import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { EventBus } from '../../core/eventBus';
import { SAVE_KEY } from '../../core/saveManager';
import { StateManager } from '../../core/stateManager';
import type { SaveStoragePort } from '../../core/persistence/browserStorage';
import { SaveRecoveryNotice } from './SaveRecoveryNotice';

function memoryStorage(): SaveStoragePort {
  const values = new Map<string, string>([[SAVE_KEY, '{broken save']]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, String(value)); },
    removeItem: (key) => { values.delete(key); },
  };
}

describe('SaveRecoveryNotice', () => {
  let root: ReturnType<typeof createRoot> | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it('opens a modal recovery dialog, contains Tab focus, and keeps recovery reachable during temporary play', () => {
    const manager = new StateManager(new EventBus(), undefined, memoryStorage());
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(createElement(SaveRecoveryNotice, { manager })));

    const dialog = container.querySelector('[role="dialog"]') as HTMLDivElement;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const buttons = [...dialog.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
    expect(buttons.length).toBeGreaterThan(1);
    expect(document.activeElement).toBe(buttons[0]);

    act(() => {
      buttons[0].focus();
      buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
    act(() => {
      buttons[buttons.length - 1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(document.activeElement).toBe(buttons[0]);

    const continueButton = buttons.find((button) => button.textContent === '继续临时游玩')!;
    act(() => continueButton.click());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    const reopen = container.querySelector<HTMLButtonElement>('button')!;
    expect(reopen.textContent).toBe('打开恢复选项');
    expect(document.activeElement).toBe(reopen);
    act(() => reopen.click());
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.activeElement).toBe(container.querySelector('[role="dialog"] button'));
  });
});
