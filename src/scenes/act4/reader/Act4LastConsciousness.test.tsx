import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../../../core/defaultState';
import { EventBus } from '../../../core/eventBus';
import { StateManager } from '../../../core/stateManager';
import { setAct4ReadingPosition } from '../../../core/uiPreferences';
import { assetLoader } from '../../../core/assetLoader';
import { act4NarrativeSections } from '../../../data/narrative/act4Narrative';
import { Act4NarrativeReader } from '../Act4NarrativeReader';
import { Act4LastConsciousness } from './Act4LastConsciousness';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const broadcast = act4NarrativeSections.find((section) => section.stage === 'T09')!.blocks.find((block) => block.id === 'T09_BROADCAST')!;

const render = async (child: ReactNode) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => { root.render(child); });
  return { host, root };
};

const click = async (button: HTMLElement | null) => {
  expect(button).not.toBeNull();
  await act(async () => { button!.click(); });
};

beforeEach(() => {
  setAct4ReadingPosition('T09:current', {
    activeBlockId: 'T09_BROADCAST',
    pageIndexByBlock: { T09_BROADCAST: 0 },
    openedCoverKeys: ['T09:current:T09_BROADCAST:T09_BROADCAST_WHOLE:cover'],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Act4LastConsciousness in the narrative reader', () => {
  it('reveals the original lines in order, keeps the ending image until the fall, and gates continuing to T10', async () => {
    const state = createDefaultState();
    state.game.act = 4;
    state.game.phase = 'A4_T09';
    state.game.flags.FLAG_A3_COMPLETE = true;
    state.modules.act3.stage = 'T07';
    state.modules.act4.stage = 'T09';
    state.modules.act4.completedNarrativeSectionIds = Array.from({ length: 8 }, (_, index) => `A4_READ_T${String(index + 1).padStart(2, '0')}`);
    state.modules.act4.completedNarrativeActionIds = [
      'A4_T02_LOGIN_SUCCEEDED', 'A4_T04_WAKE_MAIL_OPENED', 'A4_T08_ARCHIVE_OPENED',
      'A4_T09_NOTE_HIDDEN', 'A4_T09_DOOR_EXITED',
    ];
    state.modules.act4.packageStep = 3;
    state.modules.act4.broadcastIndex = 6;
    state.modules.act4.viewedWakeMail = true;
    const manager = new StateManager(new EventBus(), state);
    const originalGet = assetLoader.get.bind(assetLoader);
    vi.spyOn(assetLoader, 'get').mockImplementation((assetId) => {
      if (assetId.startsWith('IMG_A4_FINALE_')) return { id: assetId, type: 'image', src: `/assets/${assetId}.webp` };
      return originalGet(assetId);
    });
    const { host, root } = await render(<Act4NarrativeReader manager={manager} onExit={() => {}} />);

    try {
      const block = host.querySelector<HTMLElement>('[data-block-id="T09_BROADCAST"]')!;
      expect(block).not.toBeNull();
      expect(block.querySelector('.a4-last-consciousness__live-text')?.textContent).toBe(broadcast.paragraphs[0]);
      const transcript = block.querySelector<HTMLDetailsElement>('.a4-last-consciousness__transcript')!;
      expect(transcript.open).toBe(false);
      expect([...transcript.querySelectorAll('.a4-reader__paragraph')].map((item) => item.textContent)).toEqual(broadcast.paragraphs);
      const continueButton = host.querySelector<HTMLButtonElement>('.investigation-shell__operations .investigation-navigation__action')!;
      expect(continueButton.dataset.actionState).toBe('blocked');
      expect(block.querySelector('[data-asset-id="IMG_A4_FINALE_SURROUND_001"]')).toBeNull();
      expect(block.querySelector<HTMLImageElement>('[data-asset-id="IMG_A4_T09_004"]')).not.toBeNull();

      const nextButton = () => block.querySelector<HTMLButtonElement>('.a4-last-consciousness__controls button:last-child')!;
      const blurLevels: number[] = [];
      for (let index = 1; index <= 11; index += 1) {
        await click(nextButton());
        expect(block.querySelector('.a4-last-consciousness__live-text')?.textContent).toBe(broadcast.paragraphs[index]);
        expect(block.querySelector('[data-asset-id="IMG_A4_FINALE_SURROUND_001"]')).toBeNull();
        if (index === 1) {
          expect(block.querySelector<HTMLImageElement>('[data-asset-id="IMG_A4_T09_004"]')).not.toBeNull();
        }
        if (index === 2) {
          expect(block.querySelector<HTMLImageElement>('[data-asset-id="IMG_A4_FINALE_DOOR_001"]')).not.toBeNull();
        }
        const doorImage = block.querySelector<HTMLImageElement>('[data-asset-id^="IMG_A4_FINALE_DOOR_"]');
        if (doorImage) blurLevels.push(Number.parseFloat(doorImage.style.getPropertyValue('--consciousness-blur')));
      }
      expect(block.querySelector('.a4-last-consciousness__live-text')?.textContent).toBe('“表”');
      expect(blurLevels.every((blur, index) => index === 0 || blur >= blurLevels[index - 1])).toBe(true);
      const nearDoorImage = block.querySelector<HTMLImageElement>('[data-asset-id="IMG_A4_FINALE_DOOR_002"]')!;
      expect(nearDoorImage).not.toBeNull();
      expect(nearDoorImage.style.getPropertyValue('--consciousness-blur')).toBe('3.5px');

      await click(nextButton());
      expect(block.querySelector('.a4-last-consciousness__live-text')?.textContent).toBe(broadcast.paragraphs[12]);
      expect(block.querySelector<HTMLImageElement>('[data-asset-id="IMG_A4_FINALE_SURROUND_001"]')?.alt)
        .toContain('戴防毒面具的人影围拢');
      expect(continueButton.dataset.actionState).toBe('blocked');
      await click(nextButton());
      expect(block.querySelector('.a4-last-consciousness__live-text')?.textContent).toBe('“回收完成。”');
      expect(block.querySelector('[data-last-consciousness-complete="true"]')).not.toBeNull();
      expect(continueButton.dataset.actionState).toBe('ready');

      await click(block.querySelector<HTMLButtonElement>('.a4-last-consciousness__controls button:first-child'));
      expect(block.querySelector('[data-last-consciousness-complete="false"]')).not.toBeNull();
      expect(continueButton.dataset.actionState).toBe('blocked');
      await click(block.querySelector<HTMLButtonElement>('.a4-last-consciousness__controls button:nth-child(2)'));
      expect(block.querySelector('.a4-last-consciousness__live-text')?.textContent).toBe(broadcast.paragraphs[0]);
      expect(block.querySelector('[data-asset-id="IMG_A4_FINALE_SURROUND_001"]')).toBeNull();

      const summary = transcript.querySelector('summary')!;
      summary.focus();
      expect(document.activeElement).toBe(summary);
      await click(summary);
      expect(transcript.open).toBe(true);
      expect(transcript.querySelectorAll('.a4-reader__paragraph')).toHaveLength(broadcast.paragraphs.length);
      await click(transcript.querySelector<HTMLButtonElement>('button'));
      expect(block.querySelector('[data-last-consciousness-complete="true"]')).not.toBeNull();
      expect(continueButton.dataset.actionState).toBe('ready');
      await click(continueButton);
      expect(manager.getState().modules.act4.stage).toBe('T10');
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('keeps the story and controls usable when the finale image is missing', async () => {
    vi.spyOn(assetLoader, 'get').mockReturnValue(null);
    const onCompleteChange = vi.fn();
    const { host, root } = await render(<Act4LastConsciousness paragraphs={broadcast.paragraphs} onCompleteChange={onCompleteChange} />);
    try {
      expect(host.querySelector('.a4-last-consciousness__image-fallback')?.textContent).toContain('可以继续听');
      const next = host.querySelector<HTMLButtonElement>('.a4-last-consciousness__controls button:last-child')!;
      await click(next);
      expect(host.querySelector('.a4-last-consciousness__live-text')?.textContent).toBe(broadcast.paragraphs[1]);
      expect(next.disabled).toBe(false);
      expect(host.querySelectorAll<HTMLButtonElement>('.a4-last-consciousness button')).toHaveLength(4);
      expect(onCompleteChange).not.toHaveBeenCalled();
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });
});
