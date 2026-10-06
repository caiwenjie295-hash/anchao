import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../defaultState';
import { EventBus } from '../eventBus';
import { StateManager } from '../stateManager';
import type { SaveStoragePort } from '../persistence/browserStorage';
import { Act1PhaseEFController } from '../../story/act1PhaseEFController';

class MemoryStorage implements SaveStoragePort {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe('frozen Act 1 EF event trace', () => {
  beforeEach(() => localStorage.clear());

  it('preserves the synchronous nested controller trace from f9e6574', () => {
    const bus = new EventBus();
    const initial = createDefaultState();
    initial.game.phase = 'E';
    initial.game.flags.FLAG_A1_XIAOA_MISSING_KNOWN = true;
    initial.game.flags.FLAG_A1_MAIL_XIAOA_OPENED = true;
    const manager = new StateManager(bus, initial, new MemoryStorage());
    const emitted: Array<[string, unknown]> = [];
    const originalEmit = bus.emit.bind(bus);
    bus.emit = ((eventName: string, payload: unknown) => {
      emitted.push([eventName, payload]);
      originalEmit(eventName as never, payload as never);
    }) as EventBus['emit'];
    const controller = new Act1PhaseEFController(manager, bus);
    controller.start();
    emitted.length = 0;

    manager.recordBrowserPageVisit('PAGE_A1_E_001');
    manager.recordBrowserPageVisit('PAGE_A1_E_002');

    expect(emitted).toEqual([
      ['save:completed', { schemaVersion: 13 }],
      ['browser:page-opened', { pageId: 'PAGE_A1_E_001' }],
      ['save:completed', { schemaVersion: 13 }],
      ['flag:changed', { flagId: 'FLAG_A1_NEWS_FOUND', value: true }],
      ['save:completed', { schemaVersion: 13 }],
      ['browser:page-opened', { pageId: 'PAGE_A1_E_002' }],
      ['save:completed', { schemaVersion: 13 }],
      ['flag:changed', { flagId: 'FLAG_A1_ROUTE_INFO_FOUND', value: true }],
      ['save:completed', { schemaVersion: 13 }],
      ['flag:changed', { flagId: 'FLAG_A1_MISSING_CASE_SUSPICIOUS', value: true }],
      ['save:completed', { schemaVersion: 13 }],
      ['notepad:auto-entry-added', { entryId: 'NOTE_A1_E_001' }],
      ['save:completed', { schemaVersion: 13 }],
      ['notepad:auto-entry-added', { entryId: 'NOTE_A1_F_001' }],
      ['save:completed', { schemaVersion: 13 }],
      ['phase:changed', { phase: 'F' }],
    ]);
    expect(manager.getState().game.phase).toBe('F');
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual(['NOTE_A1_E_001', 'NOTE_A1_F_001']);
    expect(manager.getState().game.flags).toMatchObject({
      FLAG_A1_XIAOA_MISSING_KNOWN: true,
      FLAG_A1_MAIL_XIAOA_OPENED: true,
      FLAG_A1_NEWS_FOUND: true,
      FLAG_A1_ROUTE_INFO_FOUND: true,
      FLAG_A1_MISSING_CASE_SUSPICIOUS: true,
    });
    controller.dispose();
  });
});
