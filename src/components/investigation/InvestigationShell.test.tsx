import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
});
