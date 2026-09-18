import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { EventBus } from '../core/eventBus';
import { StateManager } from '../core/stateManager';
import { MOM_CONTACT_ID, MOM_READ_FLAG, MOM_TRIGGERED_FLAG, XIAOA_MISSING_KNOWN_FLAG } from '../data/wechatData';
import { Act1PhaseBController } from './act1PhaseBController';

describe('Act1PhaseBController', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it('waits exactly 1200ms after the first WeChat open and only triggers once', () => {
    const bus = new EventBus();
    const manager = new StateManager(bus, createDefaultState());
    const controller = new Act1PhaseBController(manager, bus);
    const phases: string[] = [];
    bus.on('phase:changed', ({ phase }) => phases.push(phase));
    controller.start();
    manager.openApp('wechat');
    vi.advanceTimersByTime(1199);
    expect(manager.getState().game.flags[MOM_TRIGGERED_FLAG]).not.toBe(true);
    expect(manager.getState().game.phase).toBe('A');
    vi.advanceTimersByTime(1);
    expect(manager.getState().game.flags[MOM_TRIGGERED_FLAG]).toBe(true);
    expect(manager.getState().game.phase).toBe('B');
    vi.advanceTimersByTime(5000);
    expect(phases).toEqual(['B']);
    controller.dispose();
  });

  it('restores a completed trigger without scheduling it again and writes both read flags on opening mother', () => {
    const firstBus = new EventBus();
    const firstManager = new StateManager(firstBus, createDefaultState());
    const firstController = new Act1PhaseBController(firstManager, firstBus);
    firstController.start();
    firstManager.openApp('wechat');
    vi.advanceTimersByTime(1200);
    const restoredBus = new EventBus();
    const restoredManager = new StateManager(restoredBus);
    const restoredController = new Act1PhaseBController(restoredManager, restoredBus);
    const phaseChanges: string[] = [];
    restoredBus.on('phase:changed', ({ phase }) => phaseChanges.push(phase));
    restoredController.start();
    vi.advanceTimersByTime(1200);
    expect(restoredManager.getState().game.flags[MOM_TRIGGERED_FLAG]).toBe(true);
    expect(phaseChanges).toEqual([]);
    restoredBus.emit('chat:opened', { contactId: MOM_CONTACT_ID });
    expect(restoredManager.getState().game.flags[MOM_READ_FLAG]).toBe(true);
    expect(restoredManager.getState().game.flags[XIAOA_MISSING_KNOWN_FLAG]).toBe(true);
    expect(restoredManager.getState().game.phase).toBe('B');
    firstController.dispose();
    restoredController.dispose();
  });

  it('restores an opened WeChat before the trigger and schedules the pending event again', () => {
    const firstBus = new EventBus();
    const firstManager = new StateManager(firstBus, createDefaultState());
    const firstController = new Act1PhaseBController(firstManager, firstBus);
    firstController.start();
    firstManager.openApp('wechat');
    vi.advanceTimersByTime(600);
    firstController.dispose();
    const restoredBus = new EventBus();
    const restoredManager = new StateManager(restoredBus);
    const restoredController = new Act1PhaseBController(restoredManager, restoredBus);
    restoredController.start();
    vi.advanceTimersByTime(1199);
    expect(restoredManager.getState().game.flags[MOM_TRIGGERED_FLAG]).not.toBe(true);
    vi.advanceTimersByTime(1);
    expect(restoredManager.getState().game.flags[MOM_TRIGGERED_FLAG]).toBe(true);
    restoredController.dispose();
  });

  it('cancels a pending mother-message timer when debug progress is reset', () => {
    const bus = new EventBus();
    const manager = new StateManager(bus, createDefaultState());
    const controller = new Act1PhaseBController(manager, bus);
    controller.start();
    manager.openApp('wechat');
    vi.advanceTimersByTime(600);
    manager.resetProgress();
    vi.advanceTimersByTime(2000);
    expect(manager.getState().game.phase).toBe('A');
    expect(manager.getState().game.flags[MOM_TRIGGERED_FLAG]).not.toBe(true);
    manager.openApp('wechat');
    vi.advanceTimersByTime(1200);
    expect(manager.getState().game.phase).toBe('B');
    controller.dispose();
  });
});
