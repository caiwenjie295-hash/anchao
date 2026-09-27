import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { act2T07 } from '../../data/act2T07Data';
import { T07Investigation } from './T07Investigation';

// React 19 需要在测试环境中显式开启 act 支持，否则 effect 不会被刷新。
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('T07 promotion investigation', () => {
  let container: HTMLDivElement;
  let root: Root;
  let manager: StateManager;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const state = createDefaultState();
    state.game.act = 2;
    state.game.phase = 'A2_T07';
    state.game.flags = {
      FLAG_A1_COMPLETE: true,
      FLAG_A1_SS_FOUND: true,
      FLAG_A2_TRANSFER_RULE_INFERRED: true,
      FLAG_A2_SCHOOL_ENTERED: true,
      FLAG_A2_SS_MATCH_CONFIRMED: true,
      FLAG_A2_QIMING_OFFICIAL_FOUND: true,
      FLAG_A2_QIMING_TESTIMONIALS_READ: true,
      FLAG_A2_QIMING_FORUM_FOUND: true,
      FLAG_A2_HUANG_MATCH_INFERRED: true,
      FLAG_A2_ZHONG_MATCH_INFERRED: true,
      FLAG_A2_OTHER_CASES_ABNORMAL: true,
    };
    state.modules.act2Research.stage = 'finale';
    manager = new StateManager(new EventBus(), state);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  const render = async () => { await act(async () => { root.render(<T07Investigation manager={manager} />); }); };
  const button = (selector: string): HTMLButtonElement => {
    const element = container.querySelector(selector);
    expect(element, `Missing button: ${selector}`).not.toBeNull();
    return element as HTMLButtonElement;
  };
  const click = async (selector: string) => { await act(async () => { button(selector).click(); }); };
  const clickTab = async (label: string) => {
    const tab = [...container.querySelectorAll('.t07-finale__tab')].find((item) => item.textContent === label) as HTMLButtonElement;
    expect(tab, `Missing tab: ${label}`).toBeDefined();
    await act(async () => { tab.click(); });
  };
  const seek = async (value: number) => {
    const input = container.querySelector('.t07-finale__seek') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, String(value));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  };
  const play = async (ms: number) => { await act(async () => { vi.advanceTimersByTime(ms); }); };
  const flags = () => manager.getState().game.flags;

  it('records the double S only after the player zooms the photo corner', async () => {
    await render();
    expect(container.querySelector('.t07-finale__photo-symbol')).toBeNull();
    expect(container.textContent).toContain(act2T07.materials[0].xiaoyueLine!);
    await click('.t07-finale__photo-zoom');
    expect(container.querySelector('.t07-finale__photo-symbol')).not.toBeNull();
    expect(flags().FLAG_A2_PROMO_PHOTO_SS_FOUND).not.toBe(true);
    await click('.t07-finale__photo-confirm');
    expect(flags().FLAG_A2_PROMO_PHOTO_SS_FOUND).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T07_001');
  });

  it('opens the video, rejects captures outside the frozen frame window and counts only real playback', async () => {
    await render();
    await click('.t07-finale__video-open');
    expect(flags().FLAG_A2_PROMO_VIDEO_FOUND).toBe(true);
    expect(container.querySelector('.t07-finale__player')).not.toBeNull();

    // 拖动到关键帧窗口外：不可截，也不算看过。
    await seek(5000);
    expect(button('.t07-finale__capture').disabled).toBe(true);
    await act(async () => { button('.t07-finale__capture').click(); });
    expect(manager.getState().modules.act2Research.t07.capturedFrameIds).toEqual([]);
    expect(flags().FLAG_A2_PROMO_VIDEO_WATCHED).not.toBe(true);

    // 落在窗口内才可截。
    await seek(7000);
    expect(button('.t07-finale__capture').disabled).toBe(false);
    await click('.t07-finale__capture');
    expect(manager.getState().modules.act2Research.t07.capturedFrameIds).toEqual(['FRAME_A2_T07_001']);

    // 只拖不播仍然不算看过；实际播放覆盖山路段后才写入 WATCHED。
    await seek(4000);
    expect(flags().FLAG_A2_PROMO_VIDEO_WATCHED).not.toBe(true);
    await click('.t07-finale__play');
    await play(4600);
    expect(manager.getState().modules.act2Research.t07.playedSegmentIds).toEqual(['SEG_A2_T07_002', 'SEG_A2_T07_003']);
    expect(flags().FLAG_A2_PROMO_VIDEO_WATCHED).toBe(true);
  });

  it('compares the captured frame with the first-hike temple exterior, not the stele close-up', async () => {
    await render();
    await click('.t07-finale__video-open');
    await seek(7000);
    await click('.t07-finale__capture');
    await clickTab('外景对照');
    const exterior = container.querySelector('[data-asset-id="IMG_A1_I_001"]');
    expect(exterior).not.toBeNull();
    expect(container.querySelector('[data-asset-id="IMG_A1_I_004"]')).toBeNull();
    await click('.t07-finale__zoom-left');
    await click('.t07-finale__zoom-right');
    await click('.t07-finale__compare');
    expect(manager.getState().modules.act2Research.t07.comparedFrameIds).toEqual(['FRAME_A2_T07_001']);
    expect(flags().FLAG_A2_TEMPLE_FRAME_FOUND).not.toBe(true);
    await click('.t07-finale__temple-confirm');
    expect(flags().FLAG_A2_TEMPLE_FRAME_FOUND).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T07_002');
  });

  it('infers the location only after every check, then plans the trip and plays the finale once', async () => {
    await render();
    await click('.t07-finale__photo-zoom');
    await click('.t07-finale__photo-confirm');
    await click('.t07-finale__video-open');
    await seek(7000);
    await click('.t07-finale__capture');
    await seek(4000);
    await click('.t07-finale__play');
    await play(4600);
    await clickTab('外景对照');
    await click('.t07-finale__zoom-left');
    await click('.t07-finale__zoom-right');
    await click('.t07-finale__compare');
    await click('.t07-finale__temple-confirm');

    await clickTab('地点结论');
    await click('.t07-finale__infer');
    expect(flags().FLAG_A2_QIMING_LOCATION_INFERRED).toBe(true);
    expect(container.textContent).toContain(act2T07.inference.conclusion);
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T07_003');

    await clickTab('再次进山');
    await click('.t07-finale__trip-confirm');
    expect(flags().FLAG_A2_SECOND_TRIP_PLANNED).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T07_004');

    // 幕末黑屏：只有行程确认后出现，且不出现进入第三幕的入口。
    expect(container.querySelector('.t07-finale__ending')).not.toBeNull();
    await act(async () => { vi.advanceTimersByTime(10000); });
    expect(container.textContent).toContain('启明。');
    expect(container.textContent).not.toContain('第三幕');
    await click('.t07-finale__ending-continue');
    expect(flags().FLAG_A2_COMPLETE).toBe(true);
    expect(container.querySelector('.t07-finale__ending')).toBeNull();
    expect(container.querySelector('.t07-finale__ending-replay')).not.toBeNull();
  });

  it('never renders a broken T07 image and always offers a text alternative', async () => {
    await render();
    for (const image of container.querySelectorAll('img')) expect(image.getAttribute('src')).toBeTruthy();
    for (const frame of container.querySelectorAll('.t07-frame')) {
      const hasImage = frame.querySelector('img') !== null;
      const placeholder = frame.querySelector('.t07-frame__placeholder');
      expect(hasImage || placeholder !== null).toBe(true);
      if (!hasImage) expect((placeholder as HTMLElement).textContent?.trim().length ?? 0).toBeGreaterThan(0);
    }
    // 缺图时给出占位画面，占位数量与真实图片数量可以共存。
    expect(container.querySelectorAll('.t07-frame').length).toBeGreaterThan(0);
  });
});
