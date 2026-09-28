import { beforeEach, describe, expect, it } from 'vitest';
import { EventBus } from './eventBus';
import { createDefaultState } from './defaultState';
import { hydrateState, loadState } from './saveManager';
import { StateManager } from './stateManager';

const readyManager = () => {
  const state = createDefaultState();
  state.game.flags.FLAG_A3_COMPLETE = true;
  return new StateManager(new EventBus(), state);
};

describe('fourth act semantic progress', () => {
  beforeEach(() => localStorage.clear());

  it('requires third act completion and explicit entry', () => {
    const manager = new StateManager(new EventBus(), createDefaultState());
    manager.startAct4();
    expect(manager.getState().modules.act4.stage).toBe('inactive');
    manager.getState().game.flags.FLAG_A3_COMPLETE = true;
    manager.startAct4();
    expect(manager.getState().modules.act4.stage).toBe('T01');
  });

  it('plays all five required puzzles without optional puzzles and retains a reload', () => {
    const manager = readyManager();
    manager.startAct4();
    expect(manager.solveAct4Puzzle('A4_P01', ['cave', 'gate', 'hydrant'])).toBe(false);
    for (const page of [2, 4, 8]) manager.readAct4NotebookPage(page);
    expect(manager.solveAct4Puzzle('A4_P01', ['cave', 'gate', 'hydrant'])).toBe(true);
    manager.advanceAct4Stage();
    expect(manager.getState().modules.act4.stage).toBe('T02');
    manager.checkAct4OldMail('protagonist');
    expect(manager.solveAct4Puzzle('A4_P04', ['20200419'])).toBe(false);
    manager.checkAct4OldMail('xiaoyue');
    expect(manager.solveAct4Puzzle('A4_P04', ['20200419'])).toBe(true);
    expect(manager.loginAct4Accounts('wrong')).toBe(false);
    expect(manager.getState().modules.act4.unlockedAccountIds).toEqual([]);
    expect(manager.loginAct4Accounts('20200419')).toBe(true);
    manager.advanceAct4Stage();
    expect(manager.getState().modules.act4.stage).toBe('T03');
    expect(manager.solveAct4Puzzle('A4_P06', ['04-03', '04-09', '04-19'])).toBe(true);
    manager.readAct4Timeline('04-10');
    manager.advanceAct4Stage();
    expect(manager.getState().modules.act4.stage).toBe('T04');
    expect(manager.solveAct4Puzzle('A4_P09', ['VVaKe'])).toBe(false);
    manager.viewAct4WakeMail();
    expect(manager.solveAct4Puzzle('A4_P09', ['VVaKe'])).toBe(true);
    manager.advanceAct4Stage();
    expect(manager.getState().modules.act4.stage).toBe('T05');
    for (const node of ['teacher', 'home', 'river', 'dinner', 'door']) manager.visitAct4BirthdayNode(node);
    expect(manager.solveAct4Puzzle('A4_P11', ['contact', 'two-months'])).toBe(true);
    manager.visitAct4BirthdayNode('taken');
    manager.advanceAct4Stage();
    expect(manager.getState().game.flags.FLAG_A4_T05_COMPLETE).toBe(true);
    expect(manager.getState().modules.act4.solvedPuzzleIds).toEqual(['A4_P01', 'A4_P04', 'A4_P06', 'A4_P09', 'A4_P11']);
    const reloaded = loadState(localStorage);
    expect(reloaded.modules.act4.stage).toBe('T05');
    expect(reloaded.modules.act4.birthdayNodeId).toBe('taken');
    expect(reloaded.modules.act4.timelineReadDates).toContain('04-10');
  });

  it('migrates schema 7 and rejects an A4 stage without its gate', () => {
    const old = createDefaultState();
    (old as unknown as { schemaVersion: number }).schemaVersion = 7;
    old.modules.mail.readIds = ['MAIL_A1_C_001'];
    const migrated = hydrateState(old);
    expect(migrated.schemaVersion).toBe(8);
    expect(migrated.modules.mail.readIds).toContain('MAIL_A1_C_001');
    expect(migrated.modules.act4.stage).toBe('inactive');
    const forged = createDefaultState();
    forged.game.phase = 'A4_T05';
    forged.modules.act4.stage = 'T05';
    forged.modules.act4.solvedPuzzleIds = ['A4_P01', 'A4_P04', 'A4_P06', 'A4_P09', 'A4_P11'];
    const cleaned = hydrateState(forged);
    expect(cleaned.modules.act4.stage).toBe('inactive');
    expect(cleaned.game.phase).not.toBe('A4_T05');
  });
});
