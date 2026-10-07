import { describe, expect, it } from 'vitest';
import { createDefaultWindow } from '../../core/defaultState';
import { fitWindowBesideTaskRail } from './desktopTaskRailLayout';

describe('desktop task rail window layout', () => {
  it('leaves a normal photos window beside the task rail at 1280px', () => {
    const photos = createDefaultWindow('photos', 10);
    photos.status = 'normal';
    const fitted = fitWindowBesideTaskRail(photos, { width: 1280, height: 720 });

    expect(fitted.bounds).toMatchObject({ x: 168, y: 100, width: 720, height: 500 });
    expect(fitted.bounds.x + fitted.bounds.width).toBeLessThanOrEqual(1280 - 376);
    expect(photos.bounds).toMatchObject({ x: 250, width: 720 });
  });

  it('maximizes into the available app area while preserving restore bounds in state', () => {
    const browser = createDefaultWindow('browser', 10);
    browser.status = 'maximized';
    browser.restoreBounds = { x: 230, y: 64, width: 860, height: 560 };
    const fitted = fitWindowBesideTaskRail(browser, { width: 1280, height: 720 });

    expect(fitted.bounds).toMatchObject({ x: 0, y: 0, width: 904, height: 656 });
    expect(fitted.restoreBounds).toEqual(browser.restoreBounds);
  });

  it('keeps a normal mobile window above the compact prompt', () => {
    const browser = createDefaultWindow('browser', 10);
    browser.status = 'normal';
    expect(fitWindowBesideTaskRail(browser, { width: 390, height: 844 })).not.toBe(browser);
    expect(fitWindowBesideTaskRail(browser, { width: 390, height: 844 }).bounds.y + fitWindowBesideTaskRail(browser, { width: 390, height: 844 }).bounds.height).toBeLessThanOrEqual(844 - 64 - 104 - 12);
  });

  it('reserves the expanded narrow prompt so a maximized photo window keeps its controls reachable', () => {
    const photos = createDefaultWindow('photos', 10);
    photos.status = 'maximized';
    const fitted = fitWindowBesideTaskRail(photos, { width: 390, height: 844 }, true);

    expect(fitted.bounds).toMatchObject({ x: 0, y: 0, width: 390, height: 524 });
    expect(fitted.bounds.y + fitted.bounds.height).toBeLessThanOrEqual(844 - 64 - 244 - 12);
  });
});
