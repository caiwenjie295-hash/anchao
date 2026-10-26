import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { assetLoader } from '../../core/assetLoader';
import { act2T07 } from '../../data/act2T07Data';
import { investigationAudio, readInvestigationAudioPreference } from '../../media/investigationAudio';
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
    localStorage.removeItem('anchao.ui.t07AmbientAudioEnabled');
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const render = async () => { await act(async () => { root.render(<T07Investigation manager={manager} />); }); };
  const loadImage = async (image: HTMLImageElement) => {
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 1448 });
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 1086 });
    await act(async () => { image.dispatchEvent(new Event('load')); });
  };
  const loadPendingImages = async () => {
    const pending = [...container.querySelectorAll<HTMLImageElement>('img[aria-hidden="true"]')].filter((image) => image.dataset.testLoaded !== 'true');
    for (const image of pending) {
      image.dataset.testLoaded = 'true';
      await loadImage(image);
    }
  };
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

  it('keeps local ambience opt-in, persists only its UI preference, and stops before leaving', async () => {
    const setEnabled = vi.spyOn(investigationAudio, 'setEnabled').mockReturnValue(true);
    const playAudio = vi.spyOn(investigationAudio, 'play').mockReturnValue(true);
    const stopAudio = vi.spyOn(investigationAudio, 'stop').mockImplementation(() => {});
    const onReturnToDesktop = vi.fn();
    await act(async () => { root.render(<T07Investigation manager={manager} onReturnToDesktop={onReturnToDesktop} />); });

    const toggle = button('.t07-finale__ambience button');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('.t07-finale__ambience')?.textContent).toContain('无声阅读');
    await click('.t07-finale__ambience button');
    expect(setEnabled).toHaveBeenCalledWith(true);
    expect(playAudio).toHaveBeenCalledWith('keyboard');
    expect(button('.t07-finale__ambience button').getAttribute('aria-pressed')).toBe('true');
    expect(readInvestigationAudioPreference()).toBe(true);

    await click('.investigation-shell__exit');
    expect(stopAudio).toHaveBeenCalled();
    expect(onReturnToDesktop).toHaveBeenCalledTimes(1);
  });

  it('records the double S only after the player zooms the photo corner', async () => {
    await render();
    await loadPendingImages();
    expect(container.querySelector('.t07-finale__photo-symbol')).toBeNull();
    expect(container.textContent).toContain(act2T07.materials[0].xiaoyueLine!);
    await click('.t07-finale__photo-zoom');
    await loadPendingImages();
    expect(container.querySelector('.t07-finale__photo-symbol')).not.toBeNull();
    expect(container.textContent).not.toContain(act2T07.materials[0].logoSpeculation!);
    expect(flags().FLAG_A2_PROMO_PHOTO_SS_FOUND).not.toBe(true);
    await click('.t07-finale__photo-confirm');
    expect(flags().FLAG_A2_PROMO_PHOTO_SS_FOUND).toBe(true);
    expect(container.textContent).toContain(act2T07.materials[0].logoSpeculation!);
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T07_001');
    await click('.t07-finale__photo-close');
    expect(container.querySelector('.t07-finale__photo-symbol')).toBeNull();
    expect(container.textContent).toContain(act2T07.materials[0].confirmedNote!);
    expect(flags().FLAG_A2_PROMO_PHOTO_SS_FOUND).toBe(true);
  });

  it('hides the calibrated double-S mark and disables confirmation when the photo fails to load', async () => {
    await render();
    await loadPendingImages();
    await click('.t07-finale__photo-zoom');
    const image = container.querySelector<HTMLImageElement>('.t07-finale__photo img')!;
    image.dataset.testLoaded = 'true';
    await act(async () => { image.dispatchEvent(new Event('error')); });
    expect(container.querySelector('.t07-finale__photo .photo-viewport__load-state')?.textContent).toContain('载入失败');
    expect(container.querySelector('.t07-finale__photo-symbol')).toBeNull();
    expect(button('.t07-finale__photo-confirm').disabled).toBe(true);
    expect(flags().FLAG_A2_PROMO_PHOTO_SS_FOUND).not.toBe(true);
  });

  it('opens the video, rejects captures outside the frozen frame window and counts only real playback', async () => {
    await render();
    await loadPendingImages();
    await click('.t07-finale__video-open');
    await loadPendingImages();
    expect(flags().FLAG_A2_PROMO_VIDEO_FOUND).toBe(true);
    expect(container.querySelector('.t07-finale__player')).not.toBeNull();

    const secondSegment = act2T07.video.segments[1];
    await click('.t07-finale__timeline-track button:nth-child(2)');
    expect((container.querySelector('.t07-finale__seek') as HTMLInputElement).value).toBe(String(secondSegment.startMs));
    expect(manager.getState().modules.act2Research.t07.playedSegmentIds).toEqual([]);
    expect(flags().FLAG_A2_PROMO_VIDEO_WATCHED).not.toBe(true);

    // 关键帧窗口外不可截，也不算看过。
    await seek(2000);
    expect(container.querySelector('.t07-finale__screen')?.getAttribute('data-asset-id')).toBe('IMG_A2_T07_003');
    expect(button('.t07-finale__capture').disabled).toBe(true);
    await act(async () => { button('.t07-finale__capture').click(); });
    expect(manager.getState().modules.act2Research.t07.capturedFrameIds).toEqual([]);
    expect(flags().FLAG_A2_PROMO_VIDEO_WATCHED).not.toBe(true);

    // 落在窗口内才可截。
    await seek(7000);
    await loadPendingImages();
    expect(container.querySelector('.t07-finale__screen')?.getAttribute('data-asset-id')).toBe('IMG_A2_T07_005');
    expect(button('.t07-finale__capture').disabled).toBe(false);
    await click('.t07-finale__capture');
    await loadPendingImages();
    expect(manager.getState().modules.act2Research.t07.capturedFrameIds).toEqual(['FRAME_A2_T07_001']);
    expect(manager.getState().modules.act2Research.t07.capturedAtMsByFrameId.FRAME_A2_T07_001).toBe(7000);
    expect(container.querySelectorAll('.t07-finale__filmstrip-item')).toHaveLength(1);
    expect(container.querySelector('.t07-finale__filmstrip-select')?.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('.t07-finale__filmstrip-item')?.textContent).toContain('00:07');
    expect(container.querySelector('.t07-finale__capture-followup')?.textContent).toContain('截图已收进调查资料');

    await seek(8800);
    await loadPendingImages();
    expect(container.querySelector('.t07-finale__screen')?.getAttribute('data-asset-id')).toBe('IMG_A2_T07_008');

    // 只拖不播仍然不算看过；实际播放覆盖山路段后才写入 WATCHED。
    await seek(4000);
    await loadPendingImages();
    expect(flags().FLAG_A2_PROMO_VIDEO_WATCHED).not.toBe(true);
    await click('.t07-finale__play');
    await play(4600);
    expect(manager.getState().modules.act2Research.t07.playedSegmentIds).toEqual(['SEG_A2_T07_002', 'SEG_A2_T07_003']);
    expect(flags().FLAG_A2_PROMO_VIDEO_WATCHED).toBe(true);
  });

  it('pauses at a slow frame, ignores an old load, retries the current image and captures its displayed time', async () => {
    await render();
    await loadPendingImages();
    await click('.t07-finale__video-open');
    await loadPendingImages();
    await seek(6600);
    await loadPendingImages();
    const previousImage = container.querySelector<HTMLImageElement>('.t07-finale__screen img')!;
    expect(previousImage.getAttribute('src')).toBe(assetLoader.get('IMG_A2_T07_TRAIL_WALK_001')?.src);

    await click('.t07-finale__play');
    await play(act2T07.video.frameMs);
    expect((container.querySelector('.t07-finale__seek') as HTMLInputElement).value).toBe('6800');
    expect(button('.t07-finale__play').textContent).toBe('暂停');
    expect(button('.t07-finale__capture').disabled).toBe(true);
    expect(container.querySelector('#t07-video-playback-status')?.textContent).toContain('载入后自动继续');
    await play(2000);
    expect((container.querySelector('.t07-finale__seek') as HTMLInputElement).value).toBe('6800');
    await click('.t07-finale__play');
    expect(button('.t07-finale__play').textContent).toBe('播放');
    expect(button('.t07-finale__play').disabled).toBe(true);

    await act(async () => { previousImage.dispatchEvent(new Event('load')); });
    expect(button('.t07-finale__capture').disabled).toBe(true);
    const templeImage = container.querySelector<HTMLImageElement>('.t07-finale__screen img')!;
    const failedSource = templeImage.getAttribute('src');
    await act(async () => { templeImage.dispatchEvent(new Event('error')); });
    expect(container.querySelector('#t07-video-playback-status')?.textContent).toContain('载入失败');
    expect(container.querySelector('.t07-frame__placeholder')?.textContent).toContain('不能完成这项观察或核对');
    expect(button('.t07-finale__capture').disabled).toBe(true);

    await click('.t07-frame__retry');
    const retryImage = container.querySelector<HTMLImageElement>('.t07-finale__screen img')!;
    expect(retryImage.getAttribute('src')).not.toBe(failedSource);
    expect(retryImage.getAttribute('src')).toContain('t07-retry=1');
    await act(async () => { previousImage.dispatchEvent(new Event('load')); });
    expect(button('.t07-finale__capture').disabled).toBe(true);
    await loadPendingImages();
    expect(container.querySelector('#t07-video-playback-status')?.textContent).toContain('已完整显示');
    expect(button('.t07-finale__play').textContent).toBe('播放');
    expect(button('.t07-finale__capture').disabled).toBe(false);

    await click('.t07-finale__capture');
    expect(manager.getState().modules.act2Research.t07.capturedAtMsByFrameId.FRAME_A2_T07_001).toBe(6800);
    await click('.t07-finale__play');
    await play(800);
    expect(manager.getState().modules.act2Research.t07.capturedAtMsByFrameId.FRAME_A2_T07_001).toBe(6800);
  });

  it('continues across loaded frame boundaries and resumes after a slow image appears', async () => {
    await render();
    await loadPendingImages();
    await click('.t07-finale__video-open');
    await loadPendingImages();
    await seek(3800);
    await click('.t07-finale__play');

    await play(200);
    expect((container.querySelector('.t07-finale__seek') as HTMLInputElement).value).toBe('4000');
    expect(button('.t07-finale__play').textContent).toBe('暂停');
    expect(container.querySelector('#t07-video-playback-status')?.textContent).toContain('载入后自动继续');
    await loadPendingImages();
    await play(200);
    expect((container.querySelector('.t07-finale__seek') as HTMLInputElement).value).toBe('4200');
    expect(button('.t07-finale__play').textContent).toBe('暂停');

    await play(2400);
    expect((container.querySelector('.t07-finale__seek') as HTMLInputElement).value).toBe('6600');
    await play(200);
    expect((container.querySelector('.t07-finale__seek') as HTMLInputElement).value).toBe('6800');
    expect(button('.t07-finale__play').textContent).toBe('暂停');
    await loadPendingImages();
    await play(200);
    expect((container.querySelector('.t07-finale__seek') as HTMLInputElement).value).toBe('7000');
    expect(button('.t07-finale__play').textContent).toBe('暂停');
    expect(manager.getState().modules.act2Research.t07.playedSegmentIds).toEqual(['SEG_A2_T07_001', 'SEG_A2_T07_002', 'SEG_A2_T07_003']);

    const visibleImage = container.querySelector<HTMLImageElement>('.t07-finale__screen img')!;
    await act(async () => { visibleImage.dispatchEvent(new Event('error')); });
    expect(button('.t07-finale__play').textContent).toBe('播放');
    expect(container.querySelector('#t07-video-playback-status')?.textContent).toContain('载入失败');
    await play(1000);
    expect((container.querySelector('.t07-finale__seek') as HTMLInputElement).value).toBe('7000');
  });

  it('keeps only play, capture and progress in the primary controls and preserves keyboard stepping', async () => {
    await render();
    await loadPendingImages();
    await click('.t07-finale__video-open');
    await loadPendingImages();
    const primaryControls = container.querySelector('.t07-finale__controls')!;
    expect(primaryControls.querySelectorAll('button')).toHaveLength(2);
    expect(container.querySelector<HTMLDetailsElement>('.t07-finale__fine-controls')?.open).toBe(false);
    await act(async () => { container.querySelector('.t07-finale__fine-controls summary')?.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(container.querySelectorAll('.t07-finale__fine-controls-buttons button')).toHaveLength(4);
    const player = container.querySelector('.t07-finale__player')!;
    await act(async () => { player.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    expect((container.querySelector('.t07-finale__seek') as HTMLInputElement).value).toBe(String(act2T07.video.frameMs));
  });

  it('records the frame-to-exterior comparison with one semantic confirmation', async () => {
    await render();
    await loadPendingImages();
    await click('.t07-finale__video-open');
    await seek(7000);
    await loadPendingImages();
    await click('.t07-finale__capture');
    await loadPendingImages();
    await click('.t07-finale__capture-followup button');
    expect(button('.t07-finale__tab.is-active').textContent).toBe('外景对照');
    await loadPendingImages();
    const comparisonImages = [...container.querySelectorAll<HTMLImageElement>('.t07-finale__compare-side .photo-viewport__plane img')];
    expect(comparisonImages).toHaveLength(2);
    expect(comparisonImages.some((image) => image.getAttribute('src') === assetLoader.get('IMG_A1_I_001')?.src)).toBe(true);
    expect(comparisonImages.some((image) => image.getAttribute('src') === assetLoader.get('IMG_A1_I_004')?.src)).toBe(false);
    expect(container.querySelectorAll('.t07-finale__tab')).toHaveLength(3);
    expect(container.querySelectorAll('.t07-finale__compare-side')).toHaveLength(2);
    const observedVideoMarker = container.querySelector<HTMLButtonElement>('[data-clue-id^="T07_OBSERVE_VIDEO_"]')!;
    expect(observedVideoMarker).toBeDefined();
    await act(async () => { observedVideoMarker.click(); });
    expect(container.querySelector('[data-clue-id^="T07_OBSERVE_VIDEO_"]')?.getAttribute('aria-label')).toContain('已标记');
    expect(flags().FLAG_A2_TEMPLE_FRAME_FOUND).not.toBe(true);
    const exteriorTextEntry = container.querySelector<HTMLButtonElement>('.t07-finale__observe-text:last-child')!;
    expect(exteriorTextEntry.disabled).toBe(false);
    await act(async () => { exteriorTextEntry.click(); });
    expect(container.querySelector('.t07-finale__observe-text:last-child')?.getAttribute('aria-pressed')).toBe('true');
    expect(flags().FLAG_A2_TEMPLE_FRAME_FOUND).not.toBe(true);
    await act(async () => { container.querySelector<HTMLInputElement>('input[name="t07-comparison-feature"][value="square-opening"]')?.click(); });
    await click('.t07-finale__compare');
    expect(manager.getState().modules.act2Research.t07.comparedFrameIds).toEqual(['FRAME_A2_T07_001']);
    expect(flags().FLAG_A2_TEMPLE_FRAME_FOUND).toBe(true);
    expect(container.querySelector('.t07-finale__temple-confirm')).toBeNull();
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T07_002');
    expect(container.textContent).toContain('基本确定是同一个地方');
    expect(container.querySelector('.t07-finale__outcomes .t07-finale__conclusion')).toBeNull();
    expect(container.querySelector('.t07-finale__outcomes .t07-finale__dialogue')).toBeNull();
  });

  it('switches between forest and temple references and keeps the forest feedback presentational', async () => {
    await render();
    await loadPendingImages();
    await click('.t07-finale__video-open');
    await seek(5000);
    await loadPendingImages();
    await click('.t07-finale__capture');
    await loadPendingImages();
    await click('.t07-finale__capture-followup button');
    await loadPendingImages();

    const forestReferenceUrl = assetLoader.get('IMG_A2_T07_TRAIL_REFERENCE_001')?.src;
    const rightImage = () => [...container.querySelectorAll<HTMLImageElement>('.t07-finale__compare-side img')]
      .find((image) => image.getAttribute('src') === assetLoader.get('IMG_A2_T07_TRAIL_REFERENCE_001')?.src
        || image.getAttribute('src') === assetLoader.get('IMG_A1_I_001')?.src);
    expect(rightImage()?.getAttribute('src')).toBe(forestReferenceUrl);
    expect(container.querySelectorAll('.t07-finale__candidate-list button[aria-pressed="true"]')).toHaveLength(1);
    expect(container.querySelector('.t07-finale__source-line')?.textContent).toContain('第一次徒步拍下的树林照片');
    expect(container.querySelectorAll('.t07-finale__compare-side figcaption')[1]?.textContent).toBe('第一次徒步拍下的树林照片');
    expect(container.querySelectorAll('.t07-finale__compare-side .photo-viewport__frame')[1]?.getAttribute('aria-label')).toContain('第一次徒步时拍下的树林环境');
    expect(container.querySelectorAll('.t07-finale__compare-side [data-clue-id^="T07_OBSERVE_EXTERIOR_"]')[0]?.getAttribute('aria-label')).toContain('树林环境相似处');
    expect(container.querySelector('.t07-finale__feature-choice')).toBeNull();
    expect(container.querySelectorAll('[aria-label="地点对照三步引导"] li')).toHaveLength(3);
    expect(container.textContent).not.toContain('石砌开口附近');
    expect(manager.getState().modules.act2Research.t07.capturedFrameIds).toEqual(['FRAME_A2_T07_002']);
    expect(flags().FLAG_A2_TEMPLE_FRAME_FOUND).not.toBe(true);
    const comparisonPanel = () => container.querySelector('.t07-finale__panel')?.textContent ?? '';
    expect(comparisonPanel()).not.toContain(act2T07.comparison.xiaoyueLine);
    expect(comparisonPanel()).not.toContain(act2T07.comparison.replyLine);
    expect(comparisonPanel()).not.toContain('基本确定');

    await click('.t07-finale__compare');
    expect(container.textContent).toContain('树林环境很相似，值得继续核对视频中的庙轮廓');
    expect(comparisonPanel()).not.toContain(act2T07.comparison.xiaoyueLine);
    expect(comparisonPanel()).not.toContain(act2T07.comparison.replyLine);
    expect(comparisonPanel()).not.toContain('基本确定');
    expect(manager.getState().modules.act2Research.t07.comparedFrameIds).toEqual([]);
    expect(flags().FLAG_A2_TEMPLE_FRAME_FOUND).not.toBe(true);
    expect(manager.submitAct2T07Comparison('FRAME_A2_T07_002', 'square-opening')).toBe('insufficient-evidence');
    expect(manager.getState().modules.act2Research.t07.comparedFrameIds).toEqual([]);
    expect(button('.t07-finale__compare').disabled).toBe(false);
    await click('.t07-finale__guide-next');
    expect(button('.t07-finale__tab.is-active').textContent).toBe('受访视频');
    expect((container.querySelector('.t07-finale__seek') as HTMLInputElement).value).toBe('6800');
    expect(manager.getState().modules.act2Research.t07.capturedFrameIds).toEqual(['FRAME_A2_T07_002']);
    expect(flags().FLAG_A2_TEMPLE_FRAME_FOUND).not.toBe(true);

    await loadPendingImages();
    await seek(7000);
    await loadPendingImages();
    await click('.t07-finale__capture');
    await loadPendingImages();
    await click('.t07-finale__capture-followup button');
    await loadPendingImages();
    expect(rightImage()?.getAttribute('src')).toBe(assetLoader.get('IMG_A1_I_001')?.src);
    expect(container.querySelector('.t07-finale__source-line')?.textContent).toContain('第一次徒步拍下的破庙外景');
    expect(container.querySelector('.t07-finale__comparison-record')).toBeNull();

    const trailCandidate = [...container.querySelectorAll<HTMLButtonElement>('.t07-finale__candidate-list button')]
      .find((item) => item.textContent?.includes('山路行进'))!;
    await act(async () => { trailCandidate.click(); });
    await loadPendingImages();
    expect(rightImage()?.getAttribute('src')).toBe(forestReferenceUrl);
    await act(async () => { trailCandidate.click(); });
    expect(button('.t07-finale__compare').disabled).toBe(false);
    await click('.t07-finale__guide-next');
    await loadPendingImages();
    expect(rightImage()?.getAttribute('src')).toBe(assetLoader.get('IMG_A1_I_001')?.src);
    await act(async () => { container.querySelector<HTMLInputElement>('input[name="t07-comparison-feature"][value="square-opening"]')?.click(); });
    await click('.t07-finale__compare');
    expect(manager.getState().modules.act2Research.t07.comparedFrameIds).toEqual(['FRAME_A2_T07_001']);
    expect(flags().FLAG_A2_TEMPLE_FRAME_FOUND).toBe(true);
    expect(container.textContent).toContain('基本确定是同一个地方');
    expect(comparisonPanel()).toContain(act2T07.comparison.xiaoyueLine);
    expect(comparisonPanel()).toContain(act2T07.comparison.replyLine);
  });

  it('explains the limits of a trail frame and returns to the video without losing saved frames', async () => {
    const restoredState = manager.getState();
    restoredState.game.flags = { ...restoredState.game.flags, FLAG_A2_PROMO_VIDEO_FOUND: true };
    restoredState.modules.act2Research.t07.capturedFrameIds = ['FRAME_A2_T07_002'];
    restoredState.modules.act2Research.t07.capturedAtMsByFrameId = { FRAME_A2_T07_002: 5000 };
    manager = new StateManager(new EventBus(), restoredState);

    await render();
    await clickTab('受访视频');
    await loadPendingImages();
    await seek(3000);
    const timeBeforeReturn = (container.querySelector('.t07-finale__seek') as HTMLInputElement).value;
    await clickTab('外景对照');
    expect(container.querySelector('.t07-finale__frame-assessment')?.textContent).toContain('树林和路线');
    expect(container.querySelector('.t07-finale__frame-assessment')?.textContent).toContain('还不能确认');
    expect(button('.t07-finale__frame-assessment button').textContent).toContain('返回视频');
    const capturedBeforeReturn = [...manager.getState().modules.act2Research.t07.capturedFrameIds];

    await click('.t07-finale__frame-assessment button');
    expect(button('.t07-finale__tab.is-active').textContent).toBe('受访视频');
    expect((container.querySelector('.t07-finale__seek') as HTMLInputElement).value).toBe(timeBeforeReturn);
    expect(button('.t07-finale__play').disabled).toBe(true);
    expect(container.querySelector('#t07-video-playback-status')?.textContent).toContain('正在载入');
    await loadPendingImages();
    expect(button('.t07-finale__play').disabled).toBe(false);
    expect(manager.getState().modules.act2Research.t07.capturedFrameIds).toEqual(capturedBeforeReturn);
  });

  it('keeps comparison pictures, captions and observation state on the selected frame through quick switches and retries', async () => {
    const restoredState = manager.getState();
    restoredState.modules.act2Research.t07.capturedFrameIds = ['FRAME_A2_T07_001', 'FRAME_A2_T07_002'];
    restoredState.modules.act2Research.t07.capturedAtMsByFrameId = { FRAME_A2_T07_001: 7000, FRAME_A2_T07_002: 5000 };
    manager = new StateManager(new EventBus(), restoredState);

    await render();
    await clickTab('外景对照');
    await loadPendingImages();
    const trailChoice = [...container.querySelectorAll<HTMLButtonElement>('.t07-finale__candidate-list button')].find((item) => item.textContent?.includes('山路行进'))!;
    const templeChoice = [...container.querySelectorAll<HTMLButtonElement>('.t07-finale__candidate-list button')].find((item) => item.getAttribute('data-frame-kind') === 'temple')!;
    await act(async () => { trailChoice.click(); });
    const staleTrailImage = [...container.querySelectorAll<HTMLImageElement>('.t07-finale__compare-side img')]
      .find((image) => image.getAttribute('src') === assetLoader.get('IMG_A2_T07_TRAIL_WALK_001')?.src)!;
    expect(button('.t07-finale__compare').disabled).toBe(true);

    await act(async () => { templeChoice.click(); });
    await loadImage(staleTrailImage);
    expect(container.querySelectorAll('.t07-finale__candidate-list button[aria-pressed="true"]')).toHaveLength(1);
    expect(container.querySelector('.t07-finale__source-line')?.textContent).toContain('00:06.8–00:08.6');
    expect(button('.t07-finale__compare').disabled).toBe(true);

    await loadPendingImages();
    expect(container.querySelector<HTMLButtonElement>('.t07-finale__compare-side:first-child .t07-finale__observe-text')?.disabled).toBe(false);
    await act(async () => { container.querySelector<HTMLInputElement>('input[name="t07-comparison-feature"][value="square-opening"]')?.click(); });
    expect(button('.t07-finale__compare').disabled).toBe(false);
    const templeScreenshot = [...container.querySelectorAll<HTMLImageElement>('.t07-finale__compare-side img')]
      .find((image) => image.getAttribute('src')?.startsWith(assetLoader.get('IMG_A2_T07_005')?.src ?? ''))!;
    const sourceBeforeRetry = templeScreenshot.getAttribute('src');
    await act(async () => { templeScreenshot.dispatchEvent(new Event('error')); });
    expect(button('.t07-finale__compare').disabled).toBe(true);
    await click('.t07-finale__compare-image-recovery .t07-finale__image-retry');
    const retriedTempleScreenshot = [...container.querySelectorAll<HTMLImageElement>('.t07-finale__compare-side img')]
      .find((image) => image.getAttribute('src')?.includes('t07-retry=1'))!;
    expect(retriedTempleScreenshot.getAttribute('src')).not.toBe(sourceBeforeRetry);
    await loadImage(staleTrailImage);
    expect(button('.t07-finale__compare').disabled).toBe(true);
    await loadPendingImages();
    expect(button('.t07-finale__compare').disabled).toBe(false);

    const templeObservation = container.querySelector<HTMLButtonElement>('.t07-finale__compare-side:first-child .t07-finale__observe-text')!;
    await act(async () => { templeObservation.click(); });
    await act(async () => { trailChoice.click(); });
    expect(container.querySelector('.t07-finale__source-line')?.textContent).toContain('00:04.0–00:06.4');
    expect(container.querySelectorAll('.t07-finale__compare-side figcaption')[1]?.textContent).toBe('第一次徒步拍下的树林照片');
    expect(container.querySelector('.t07-finale__compare-side:first-child .t07-finale__observe-text')?.getAttribute('aria-pressed')).toBe('false');
    await loadPendingImages();
    await act(async () => { container.querySelector<HTMLButtonElement>('.t07-finale__compare-side:first-child .t07-finale__observe-text')?.click(); });
    expect(container.querySelector('.t07-finale__compare-side:first-child .t07-finale__observe-text')?.getAttribute('aria-pressed')).toBe('true');
    await act(async () => { templeChoice.click(); });
    await loadPendingImages();
    expect(container.querySelector('.t07-finale__compare-side:first-child .t07-finale__observe-text')?.getAttribute('aria-pressed')).toBe('true');

    await clickTab('宣传资料');
    await clickTab('外景对照');
    expect(container.querySelector<HTMLButtonElement>('.t07-finale__compare-side:first-child .t07-finale__observe-text')?.disabled).toBe(true);
    expect(container.querySelector('#t07-compare-media-status')?.textContent).toContain('载入失败');
    await loadPendingImages();
    expect(container.querySelector<HTMLButtonElement>('.t07-finale__compare-side:first-child .t07-finale__observe-text')?.disabled).toBe(false);
    expect(container.querySelector('.t07-finale__compare-side:first-child .t07-finale__observe-text')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('restores the comparison dialogue from an existing temple-confirmed save', async () => {
    const restoredState = manager.getState();
    restoredState.game.flags = { ...restoredState.game.flags, FLAG_A2_TEMPLE_FRAME_FOUND: true };
    restoredState.modules.act2Research.t07.capturedFrameIds = ['FRAME_A2_T07_001'];
    // Older confirmed saves may retain the flag and screenshot without a comparison record.
    restoredState.modules.act2Research.t07.capturedAtMsByFrameId = {};
    manager = new StateManager(new EventBus(), restoredState);

    await render();
    await clickTab('外景对照');
    await loadPendingImages();

    const comparisonPanel = container.querySelector('.t07-finale__panel')?.textContent ?? '';
    expect(comparisonPanel).toContain(act2T07.comparison.xiaoyueLine);
    expect(comparisonPanel).toContain(act2T07.comparison.replyLine);
  });

  it('blocks trail comparison when the selected reference image fails to load', async () => {
    await render();
    await loadPendingImages();
    await click('.t07-finale__video-open');
    await seek(5000);
    await loadPendingImages();
    await click('.t07-finale__capture');
    await loadPendingImages();
    await click('.t07-finale__capture-followup button');
    const expectedUrl = assetLoader.get('IMG_A2_T07_TRAIL_REFERENCE_001')?.src;
    const failedReference = [...container.querySelectorAll<HTMLImageElement>('.t07-finale__compare-side img')]
      .find((image) => image.getAttribute('src') === expectedUrl)!;
    expect(failedReference).toBeDefined();
    failedReference.dataset.testLoaded = 'true';
    await act(async () => { failedReference.dispatchEvent(new Event('error')); });
    await loadPendingImages();
    expect(container.textContent).toContain('载入失败');
    expect(button('.t07-finale__compare').disabled).toBe(true);
    expect(manager.submitAct2T07Comparison('FRAME_A2_T07_002', 'square-opening')).toBe('insufficient-evidence');
    expect(manager.getState().modules.act2Research.t07.comparedFrameIds).toEqual([]);
    expect(flags().FLAG_A2_TEMPLE_FRAME_FOUND).not.toBe(true);
  });

  it('does not show a prior successful comparison as feedback for a different weak frame', async () => {
    const getAsset = assetLoader.get.bind(assetLoader);
    vi.spyOn(assetLoader, 'get').mockImplementation((assetId) => assetId === 'IMG_A2_T07_TRAIL_WALK_001'
      ? { id: assetId, type: 'image', src: '/test/IMG_A2_T07_TRAIL_WALK_001.webp' }
      : getAsset(assetId));
    await render();
    await loadPendingImages();
    await click('.t07-finale__video-open');
    await seek(7000); await loadPendingImages(); await click('.t07-finale__capture');
    await loadPendingImages();
    await seek(5000); await loadPendingImages(); await click('.t07-finale__capture');
    await loadPendingImages();
    await clickTab('外景对照');
    await loadPendingImages();
    await click('.t07-finale__candidate-list button');
    await loadPendingImages();
    await act(async () => { container.querySelector<HTMLInputElement>('input[name="t07-comparison-feature"][value="square-opening"]')?.click(); });
    await click('.t07-finale__compare');
    expect(manager.getState().modules.act2Research.t07.comparedFrameIds).toEqual(['FRAME_A2_T07_001']);
    const secondFrame = [...container.querySelectorAll('.t07-finale__candidate-list button')].find((item) => item.textContent?.includes('山路行进')) as HTMLButtonElement;
    expect(secondFrame).toBeDefined();
    await act(async () => { secondFrame.click(); });
    await loadPendingImages();
    await click('.t07-finale__compare');
    expect(container.textContent).toContain(act2T07.comparison.trailReference.note);
    expect(container.querySelector('.t07-shell--mismatch-status, .investigation-shell.t07-shell--mismatch-status')).toBeNull();
    expect(manager.getState().modules.act2Research.t07.comparedFrameIds).toEqual(['FRAME_A2_T07_001']);
    expect(manager.submitAct2T07Comparison('FRAME_A2_T07_002', 'square-opening')).toBe('insufficient-evidence');
    expect(manager.getState().modules.act2Research.t07.comparedFrameIds).toEqual(['FRAME_A2_T07_001']);
  });

  it('infers the location only after every check, then plans the trip and plays the finale once', async () => {
    await render();
    await loadPendingImages();
    await click('.t07-finale__photo-zoom');
    await loadPendingImages();
    await click('.t07-finale__photo-confirm');
    await click('.t07-finale__video-open');
    await seek(7000);
    await loadPendingImages();
    await click('.t07-finale__capture');
    await loadPendingImages();
    await seek(4000);
    await loadPendingImages();
    await click('.t07-finale__play');
    await play(4600);
    await clickTab('外景对照');
    await loadPendingImages();
    await act(async () => { container.querySelector<HTMLInputElement>('input[name="t07-comparison-feature"][value="square-opening"]')?.click(); });
    await click('.t07-finale__compare');

    await click('[data-action-id="A2_T07_CURRENT_INFER"]');
    expect(flags().FLAG_A2_QIMING_LOCATION_INFERRED).toBe(true);
    expect(container.textContent).toContain(act2T07.inference.conclusion);
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T07_003');
    expect(container.querySelector('.t07-finale__outcomes .t07-finale__dialogue')).not.toBeNull();

    await click('[data-action-id="A2_T07_CURRENT_TRIP_CONVERSATION"]');
    await click('[data-action-id="A2_T07_CURRENT_PLAN_TRIP"]');
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

  // 工单 §15 工作包 H：第二幕收束页必须直接给出进入第三幕的主操作。
  it('offers a direct act three entry on the closing page instead of forcing the desktop menu', async () => {
    manager.getState().game.flags = {
      ...manager.getState().game.flags,
      FLAG_A2_PROMO_PHOTO_SS_FOUND: true,
      FLAG_A2_TEMPLE_FRAME_FOUND: true,
      FLAG_A2_QIMING_LOCATION_INFERRED: true,
      FLAG_A2_SECOND_TRIP_PLANNED: true,
      FLAG_A2_COMPLETE: true,
    };
    const onEnterAct3 = vi.fn();
    await act(async () => { root.render(<T07Investigation manager={manager} onEnterAct3={onEnterAct3} />); });

    const entry = container.querySelector('.t07-finale__closing .t07-finale__enter-act3') as HTMLButtonElement;
    expect(entry).not.toBeNull();
    expect(entry.textContent).toBe('再次进山，调查启明旧址');
    // 主操作与「回看资料」并存，且回看仍在。
    expect(container.querySelector('.t07-finale__ending-replay')).not.toBeNull();

    await act(async () => { entry.click(); });
    expect(onEnterAct3).toHaveBeenCalledTimes(1);
  });

  it('falls back to desktop guidance when no act three entry is provided', async () => {
    manager.getState().game.flags = { ...manager.getState().game.flags, FLAG_A2_COMPLETE: true };
    await render();
    // 没有 onEnterAct3 时不能渲染一个空按钮，必须说明去哪继续。
    expect(container.querySelector('.t07-finale__enter-act3')).toBeNull();
    expect(container.textContent).toContain('按当前步骤继续即可');
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
