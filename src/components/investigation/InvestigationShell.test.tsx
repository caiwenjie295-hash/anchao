import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { InvestigationProgressProvider } from '../InvestigationProgressContext';
import { InvestigationProgressDrawer } from '../InvestigationProgressDrawer';
import { InvestigationShell } from './InvestigationShell';
import type { InvestigationAction } from './types';

describe('InvestigationShell guidance variants', () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
  });

  const render = async (className?: string, actions: InvestigationAction[] = []) => act(async () => root.render(<InvestigationShell
    ariaLabel="调查"
    actLabel="第二幕"
    locationLabel="阅览室"
    objective="从旧录找到共同变化。"
    helpText="逐篇阅读，再选取支持片段。"
    className={className}
    actions={actions}
    onExit={vi.fn()}
  >场景内容</InvestigationShell>));

  it('puts semantic reading guidance behind a disclosure while preserving its content and scene actions', async () => {
    await render('investigation-shell--reading');
    const disclosure = host.querySelector<HTMLDetailsElement>('.investigation-shell__goal-details')!;
    const summary = disclosure.querySelector('summary')!;
    expect(disclosure.open).toBe(false);
    expect(summary.textContent).toBe('当前目标与操作提示');
    expect(summary.tabIndex).toBe(0);
    expect(disclosure.textContent).toContain('从旧录找到共同变化。');
    expect(disclosure.textContent).toContain('逐篇阅读，再选取支持片段。');
    expect(host.querySelector('.investigation-shell__scene')?.textContent).toBe('场景内容');

    await act(async () => disclosure.querySelector('summary')?.click());
    expect(disclosure.open).toBe(true);
    expect(disclosure.querySelector('.investigation-shell__goal-content')?.textContent).toContain('当前目标');
  });

  it('keeps legacy shell guidance visible and retains its existing help toggle', async () => {
    await render();
    expect(host.querySelector('.investigation-shell__goal-details')).toBeNull();
    expect(host.querySelector('.investigation-shell__goal')?.textContent).toContain('从旧录找到共同变化。');
    const help = host.querySelector<HTMLButtonElement>('.investigation-shell__goal button')!;
    expect(help.getAttribute('aria-expanded')).toBe('false');
    await act(async () => help.click());
    expect(host.querySelector('.investigation-shell__help')?.textContent).toBe('逐篇阅读，再选取支持片段。');
  });

  it('offers an opt-in compact photo-stage header while retaining the chapter portal anchor', async () => {
    await act(async () => root.render(<InvestigationShell
      ariaLabel="现场调查"
      actLabel="第三幕 · 接近"
      locationLabel="厨房"
      contextLabel="同名现场照片 2 / 3"
      objective="查看厨房门牌。"
      helpText="拖动画面查看细节。"
      photoStage
      onExit={vi.fn()}
    >照片</InvestigationShell>));
    const photoHelp = host.querySelector<HTMLDetailsElement>('.investigation-shell__photo-help')!;
    expect(photoHelp.open).toBe(false);
    expect(photoHelp.querySelector('summary')?.getAttribute('aria-label')).toBe('打开看图操作说明');
    expect(photoHelp.textContent).toContain('拖动画面查看细节');
    await act(async () => { photoHelp.querySelector('summary')?.click(); });
    expect(photoHelp.open).toBe(true);
    const tools = host.querySelector<HTMLDetailsElement>('.investigation-shell__photo-tools')!;
    expect(tools.querySelector('summary')?.textContent).toBe('更多');
    expect(host.querySelector('.investigation-shell__goal')).toBeNull();
    expect(host.querySelector('.investigation-shell__header-actions')).not.toBeNull();
    expect(host.querySelector('.investigation-shell__photo-tools-panel')?.textContent).toContain('查看厨房门牌。');
    await act(async () => { tools.querySelector('summary')?.click(); });
    expect(tools.querySelector('.investigation-shell__exit')?.textContent).toBe('退出调查，返回桌面');
  });

  it('keeps blocked reasons and their related materials available in a semantic shell', async () => {
    await render('investigation-shell--reading', [{
      actionId: 'open-source',
      kind: 'move',
      label: '继续前往旧录',
      state: 'blocked',
      reason: '先读完目标书页。',
      relatedMaterials: [{ id: 'target-page', label: '《补母志》目标页' }],
      onOpenMaterial: vi.fn(),
    }]);
    const blocked = host.querySelector<HTMLButtonElement>('[data-action-id="open-source"]')!;
    expect(blocked.disabled).toBe(false);
    await act(async () => blocked.click());
    expect(host.querySelector('.investigation-navigation__reason')?.textContent).toContain('先读完目标书页。');
    expect(host.querySelector('.investigation-navigation__material')?.textContent).toContain('《补母志》目标页');
  });

  it('offers the shared progress drawer from the shell header without changing shell props', async () => {
    const state = createDefaultState();
    await act(async () => root.render(<InvestigationProgressProvider state={state}>
      <>
        <InvestigationShell ariaLabel="调查" actLabel="第二幕" locationLabel="阅览室" objective="继续阅读。" onExit={vi.fn()}>场景内容</InvestigationShell>
        <InvestigationProgressDrawer state={state} />
      </>
    </InvestigationProgressProvider>));

    const trigger = host.querySelector<HTMLButtonElement>('.investigation-shell__header-actions [aria-label="打开调查进度"]')!;
    expect(trigger.textContent).toContain('调查进度');
    await act(async () => trigger.click());
    expect(host.querySelector<HTMLDialogElement>('.investigation-progress')?.open).toBe(true);
  });
});
