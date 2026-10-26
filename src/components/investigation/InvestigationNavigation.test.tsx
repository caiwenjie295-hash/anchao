import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { InvestigationNavigation } from './InvestigationNavigation';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('InvestigationNavigation', () => {
  it('keeps a blocked action focusable and shows a nearby reason and material link', async () => {
    const onOpenMaterial = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(<InvestigationNavigation actions={[{
        actionId: 'go-to-archive',
        kind: 'move',
        target: 'archive',
        label: '前往档案室',
        state: 'blocked',
        reason: '还没有核对这两张照片。',
        relatedMaterials: [{ id: 'photo-pair', label: '两张照片的对照' }],
        onOpenMaterial,
      }]} />));
      const blocked = host.querySelector<HTMLButtonElement>('[data-action-id="go-to-archive"]')!;
      expect(blocked.disabled).toBe(false);
      expect(host.textContent).not.toContain('还没有核对');
      await act(async () => blocked.click());
      expect(host.querySelector('#investigation-reason-go-to-archive')?.textContent).toContain('还没有核对这两张照片。');
      await act(async () => host.querySelector<HTMLButtonElement>('.investigation-navigation__material')!.click());
      expect(onOpenMaterial).toHaveBeenCalledWith({ id: 'photo-pair', label: '两张照片的对照' });
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('activates ready actions and omits unavailable destinations', async () => {
    const onActivate = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(<InvestigationNavigation actions={[
        { actionId: 'continue', kind: 'story', label: '收好笔记，回酒店', state: 'ready', onActivate },
        { actionId: 'future', kind: 'move', label: '未来房间', state: 'unavailable' },
      ]} />));
      expect(host.textContent).not.toContain('未来房间');
      await act(async () => host.querySelector<HTMLButtonElement>('[data-action-id="continue"]')!.click());
      expect(onActivate).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('keeps one previous/next pair and preserves named branches, blocked reasons, and stage actions in the secondary menu', async () => {
    const onOpenMaterial = vi.fn();
    const onActivate = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(<InvestigationNavigation presentation="photo-stage" actions={[
        { actionId: 'back', kind: 'return', label: '返回前厅', state: 'ready', onActivate },
        { actionId: 'next', kind: 'move', label: '下一张现场照片', state: 'ready', onActivate },
        { actionId: 'branch', kind: 'move', label: '沿山路返回入口', state: 'ready', onActivate },
        { actionId: 'finish', kind: 'story', label: '结束本阶段', state: 'blocked', reason: '还有一处必需观察。', relatedMaterials: [{ id: 'photo', label: '当前照片' }], onOpenMaterial },
      ]} />));
      const primary = [...host.querySelectorAll<HTMLButtonElement>('[data-action-emphasis="primary"]')];
      expect(primary).toHaveLength(1);
      expect(primary.map((button) => button.textContent)).toEqual(['下一张']);
      expect(host.querySelector('[data-action-id="back"]')?.getAttribute('data-action-emphasis')).toBe('secondary');

      const menu = host.querySelector<HTMLDetailsElement>('.investigation-navigation__other-actions')!;
      expect(menu.open).toBe(false);
      expect(host.querySelector('[data-action-id="branch"]')?.closest('details')).toBe(menu);
      await act(async () => { menu.querySelector('summary')?.click(); });
      expect(host.querySelector('[data-action-id="branch"]')?.textContent).toContain('沿山路返回入口');
      expect(host.querySelector('[data-action-id="finish"]')?.textContent).toContain('结束本阶段');
      await act(async () => { host.querySelector<HTMLButtonElement>('[data-action-id="finish"]')!.click(); });
      expect(host.querySelector('.investigation-navigation__reason')?.textContent).toContain('还有一处必需观察。');
      await act(async () => { host.querySelector<HTMLButtonElement>('.investigation-navigation__material')!.click(); });
      expect(onOpenMaterial).toHaveBeenCalledWith({ id: 'photo', label: '当前照片' });
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('keeps first and last photo placeholders paired with the available route', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const route = (actionId: string, kind: 'return' | 'move') => ({ actionId, kind, label: kind === 'return' ? '返回原路' : '下一张现场照片', state: 'ready' as const });
    try {
      await act(async () => root.render(<InvestigationNavigation presentation="photo-stage" actions={[route('first-next', 'move')]} />));
      expect(host.querySelector('.investigation-navigation__photo-pair')?.children).toHaveLength(2);
      expect(host.querySelector('.investigation-navigation__photo-empty')?.textContent).toBe('上一张');
      expect(host.querySelector('[data-action-id="first-next"]')?.getAttribute('data-action-emphasis')).toBe('primary');

      await act(async () => root.render(<InvestigationNavigation presentation="photo-stage" actions={[route('last-back', 'return')]} />));
      expect(host.querySelector('.investigation-navigation__photo-pair')?.children).toHaveLength(2);
      expect(host.querySelector('.investigation-navigation__photo-empty')?.textContent).toBe('下一张');
      expect(host.querySelector('[data-action-id="last-back"]')?.getAttribute('data-action-emphasis')).toBe('secondary');
      expect(host.querySelector('[data-action-emphasis="primary"]')).toBeNull();
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('emphasizes exactly one forward action by story, then memory, then first move priority', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const ready = (actionId: string, kind: 'move' | 'story' | 'memory' | 'return') => ({ actionId, kind, label: actionId, state: 'ready' as const });
    const render = async (actions: ReturnType<typeof ready>[]) => act(async () => root.render(<InvestigationNavigation actions={actions} />));
    const primaryIds = () => [...host.querySelectorAll<HTMLButtonElement>('[data-action-emphasis="primary"]')].map((button) => button.dataset.actionId);

    try {
      await render([
        ready('move-first', 'move'),
        ready('memory-next', 'memory'),
        ready('move-next', 'move'),
        ready('story-first', 'story'),
        ready('return-secondary', 'return'),
        ready('story-next', 'story'),
      ]);
      expect(primaryIds()).toEqual(['story-first']);
      expect(host.querySelector('[data-action-id="memory-next"]')?.getAttribute('data-action-emphasis')).toBe('secondary');
      expect(host.querySelector('[data-action-id="move-first"]')?.getAttribute('data-action-emphasis')).toBe('secondary');

      await render([ready('move-first', 'move'), ready('memory-first', 'memory'), ready('move-next', 'move')]);
      expect(primaryIds()).toEqual(['memory-first']);

      await render([ready('move-first', 'move'), ready('move-next', 'move')]);
      expect(primaryIds()).toEqual(['move-first']);
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });
});
