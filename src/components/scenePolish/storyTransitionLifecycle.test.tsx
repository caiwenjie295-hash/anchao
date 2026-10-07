import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { StoryTransition } from '../StoryTransition';
import type { StoryTransitionRecord } from '../../data/storyTransitionData';
import { installMatchMediaMock } from './matchMediaMock';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function record(id: string): StoryTransitionRecord {
  return { id, phase: 'A', trigger: 'phase', requiredFlags: [], eyebrow: '调查', title: id, paragraphs: ['文字'], actionLabel: '继续' };
}

function KeyedTransition({ id, onContinue }: { id: string; onContinue: (id: string) => void }) {
  return <StoryTransition key={id} transition={record(id)} onContinue={() => onContinue(id)} />;
}

describe('story transition curtain lifecycle', () => {
  it('cancels an interrupted curtain and gives a new transition id a fresh exit', async () => {
    const media = installMatchMediaMock(false);
    vi.useFakeTimers();
    const onContinue = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(<KeyedTransition id="TRANSITION_ONE" onContinue={onContinue} />));
      await act(async () => host.querySelector<HTMLButtonElement>('button')?.click());
      expect(host.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);

      await act(async () => root.render(<KeyedTransition id="TRANSITION_TWO" onContinue={onContinue} />));
      const secondButton = host.querySelector<HTMLButtonElement>('button')!;
      expect(secondButton.disabled).toBe(false);
      await act(async () => secondButton.click());
      await act(async () => { vi.advanceTimersByTime(240); });
      expect(onContinue).toHaveBeenCalledTimes(1);
      expect(onContinue).toHaveBeenCalledWith('TRANSITION_TWO');
    } finally {
      await act(async () => root.unmount());
      host.remove();
      media.restore();
      vi.useRealTimers();
    }
  });
});
