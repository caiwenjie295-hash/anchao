import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { EventBus } from '../core/eventBus';
import { StateManager } from '../core/stateManager';
import { XIAOA_MAIL_FLAGS, XIAOA_MAIL_ID } from '../data/mailData';
import { XIAOA_MISSING_KNOWN_FLAG } from '../data/wechatData';
import { Act1PhaseCController } from './act1PhaseCController';

describe('Act1PhaseCController', () => {
  beforeEach(() => localStorage.clear());

  it('records all mail clues first and waits for the mother-message knowledge before entering C', () => {
    const bus = new EventBus();
    const manager = new StateManager(bus, createDefaultState());
    const controller = new Act1PhaseCController(manager, bus);
    controller.start();
    manager.markMailRead(XIAOA_MAIL_ID);
    expect(XIAOA_MAIL_FLAGS.every((flagId) => manager.getState().game.flags[flagId] === true)).toBe(true);
    expect(manager.getState().game.phase).toBe('A');
    manager.setFlag(XIAOA_MISSING_KNOWN_FLAG, true);
    expect(manager.getState().game.phase).toBe('C');
    controller.dispose();
  });

  it('enters C immediately when the missing-person knowledge already exists', () => {
    const bus = new EventBus();
    const state = createDefaultState();
    state.game.phase = 'B';
    state.game.flags[XIAOA_MISSING_KNOWN_FLAG] = true;
    const manager = new StateManager(bus, state);
    const controller = new Act1PhaseCController(manager, bus);
    controller.start();
    manager.markMailRead(XIAOA_MAIL_ID);
    expect(manager.getState().game.phase).toBe('C');
    controller.dispose();
  });
});
