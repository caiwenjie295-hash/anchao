import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { InvestigationNavigation } from './InvestigationNavigation';

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
