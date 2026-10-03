import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import type { AppId, AppState } from '../core/types';
import { InvestigationProgressProvider, useInvestigationProgress } from './InvestigationProgressContext';
import { InvestigationProgressDrawer } from './InvestigationProgressDrawer';

function ProgressTrigger() {
  const progress = useInvestigationProgress();
  return <button type="button" aria-label="打开调查进度" onClick={(event) => progress?.openProgress(event.currentTarget)}>打开调查进度</button>;
}

function Harness({ state, suppressed, onOpenApp }: { state: AppState; suppressed?: boolean; onOpenApp?: (appId: AppId) => void }) {
  return <InvestigationProgressProvider state={state} suppressed={suppressed} onOpenApp={onOpenApp}>
    <ProgressTrigger />
    <InvestigationProgressDrawer state={state} />
  </InvestigationProgressProvider>;
}

describe('InvestigationProgressDrawer', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    document.querySelectorAll('[data-test-modal]').forEach((element) => element.remove());
    vi.restoreAllMocks();
  });

  const render = async (state: AppState, options: { suppressed?: boolean; onOpenApp?: (appId: AppId) => void } = {}) => act(async () => root.render(
    <Harness state={state} suppressed={options.suppressed} onOpenApp={options.onOpenApp} />,
  ));

  it('opens a native dialog with current goals and returns focus without changing game state', async () => {
    const state = createDefaultState();
    const before = JSON.stringify(state);
    await render(state);
    const opener = host.querySelector<HTMLButtonElement>('[aria-label="打开调查进度"]')!;

    await act(async () => opener.click());
    const dialog = host.querySelector<HTMLDialogElement>('.investigation-progress')!;
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute('aria-labelledby')).toBe('investigation-progress-title');
    expect(dialog.textContent).toContain('当前目标');
    expect(dialog.textContent).toContain('下一步');
    expect(dialog.textContent).not.toContain('黄子山');
    expect(dialog.textContent).not.toContain('钟子月');
    expect(dialog.textContent).not.toContain('禁闭室');
    expect(document.activeElement).toBe(dialog.querySelector('[aria-label="关闭调查进度"]'));
    expect(JSON.stringify(state)).toBe(before);

    await act(async () => (dialog.querySelector('[aria-label="关闭调查进度"]') as HTMLButtonElement).click());
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('blocks opening while a transition/modal is active or the provider is suppressed', async () => {
    const state = createDefaultState();
    const modal = document.createElement('div');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('data-test-modal', 'true');
    document.body.append(modal);
    await render(state);
    let opener = host.querySelector<HTMLButtonElement>('[aria-label="打开调查进度"]')!;
    await act(async () => opener.click());
    expect(host.querySelector<HTMLDialogElement>('.investigation-progress')?.open).toBe(false);

    modal.remove();
    await render(state, { suppressed: true });
    opener = host.querySelector<HTMLButtonElement>('[aria-label="打开调查进度"]')!;
    await act(async () => opener.click());
    expect(host.querySelector<HTMLDialogElement>('.investigation-progress')?.open).toBe(false);
  });

  it('opens the relevant app from the current next action', async () => {
    const state = createDefaultState();
    state.game.act = 2;
    state.game.phase = 'A2_T06';
    state.game.flags.FLAG_A1_COMPLETE = true;
    state.game.flags.FLAG_A2_TRANSFER_RULE_INFERRED = true;
    state.modules.act2Research.stage = 'qiming';
    const onOpenApp = vi.fn();
    await render(state, { onOpenApp });
    const opener = host.querySelector<HTMLButtonElement>('[aria-label="打开调查进度"]')!;

    await act(async () => opener.click());
    const dialog = host.querySelector<HTMLDialogElement>('.investigation-progress')!;
    expect(dialog.textContent).toContain('启明公开来源');
    await act(async () => (dialog.querySelector('.investigation-progress__open-app') as HTMLButtonElement).click());
    expect(onOpenApp).toHaveBeenCalledWith('browser');
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(opener);
  });
});
