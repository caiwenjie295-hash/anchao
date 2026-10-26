import { describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { requestBrowserSearch, subscribeToBrowserSearchRequest } from './browserSearchRequest';

const manager = () => new StateManager(new EventBus(), createDefaultState());

describe('one-shot browser search requests', () => {
  it('waits for an unmounted browser and is consumed only once without replaying history', () => {
    const app = manager();
    const onRequest = vi.fn();
    requestBrowserSearch(app, 'XX县失踪');

    const unsubscribe = subscribeToBrowserSearchRequest(app, onRequest);
    expect(onRequest).toHaveBeenCalledExactlyOnceWith({ query: 'XX县失踪' });
    unsubscribe();
    subscribeToBrowserSearchRequest(app, onRequest);
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(app.getState().modules.browser.queryHistory).toEqual([]);
  });

  it('delivers to an already mounted browser and keeps manager instances isolated', () => {
    const first = manager();
    const second = manager();
    const firstRequest = vi.fn();
    const secondRequest = vi.fn();
    const unsubscribeFirst = subscribeToBrowserSearchRequest(first, firstRequest);
    const unsubscribeSecond = subscribeToBrowserSearchRequest(second, secondRequest);

    requestBrowserSearch(first, '鸡公岭徒步');

    expect(firstRequest).toHaveBeenCalledExactlyOnceWith({ query: '鸡公岭徒步' });
    expect(secondRequest).not.toHaveBeenCalled();
    expect(first.getState().modules.browser.queryHistory).toEqual([]);
    unsubscribeFirst();
    unsubscribeSecond();
  });
});
