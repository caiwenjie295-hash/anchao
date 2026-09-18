import { beforeEach, describe, expect, it } from 'vitest';
import { EventBus } from './eventBus';
import { createDefaultState } from './defaultState';
import { StateManager } from './stateManager';

describe('StateManager window behaviour', () => {
  let bus: EventBus;
  let manager: StateManager;
  beforeEach(() => {
    localStorage.clear();
    bus = new EventBus();
    manager = new StateManager(bus, createDefaultState());
  });

  it('opens, focuses, minimizes and restores an app through the same state domain', () => {
    manager.openApp('mail');
    expect(manager.getState().desktop.windows.mail.status).toBe('normal');
    manager.minimizeWindow('mail');
    expect(manager.getState().desktop.windows.mail.status).toBe('minimized');
    manager.focusWindow('mail');
    expect(manager.getState().desktop.windows.mail.status).toBe('normal');
    expect(manager.getState().desktop.activeAppId).toBe('mail');
  });

  it('preserves geometry when maximizing then restoring', () => {
    manager.openApp('browser');
    const before = manager.getState().desktop.windows.browser.bounds;
    manager.toggleMaximize('browser');
    expect(manager.getState().desktop.windows.browser.status).toBe('maximized');
    manager.toggleMaximize('browser');
    expect(manager.getState().desktop.windows.browser).toMatchObject({ status: 'normal', bounds: before, restoreBounds: null });
  });

  it('minimizes and restores an active maximized app through the taskbar state API', () => {
    manager.openApp('browser');
    manager.toggleMaximize('browser');
    manager.toggleTaskbarApp('browser');
    expect(manager.getState().desktop.windows.browser.status).toBe('minimized');
    manager.toggleTaskbarApp('browser');
    expect(manager.getState().desktop.windows.browser.status).toBe('maximized');
  });

  it('activates the topmost remaining visible window after closing or minimizing the active one', () => {
    manager.openApp('wechat');
    manager.openApp('mail');
    manager.openApp('browser');
    manager.closeWindow('browser');
    expect(manager.getState().desktop.activeAppId).toBe('mail');
    manager.minimizeWindow('mail');
    expect(manager.getState().desktop.activeAppId).toBe('wechat');
  });

  it('emits the fixed public events', () => {
    const received: string[] = [];
    bus.on('app:opened', () => received.push('opened'));
    bus.on('window:focused', () => received.push('focused'));
    bus.on('app:closed', () => received.push('closed'));
    manager.openApp('wechat');
    manager.closeWindow('wechat');
    expect(received).toEqual(['opened', 'focused', 'closed']);
  });

  it('does not emit a second app-opened event when a minimized window is restored', () => {
    const received: string[] = [];
    bus.on('app:opened', () => received.push('opened'));
    bus.on('window:focused', () => received.push('focused'));
    manager.openApp('wechat');
    manager.minimizeWindow('wechat');
    manager.toggleTaskbarApp('wechat');
    expect(received).toEqual(['opened', 'focused', 'focused']);
  });

  it('changes phase through the typed state API and emits the public event once', () => {
    const received: string[] = [];
    bus.on('phase:changed', ({ phase }) => received.push(phase));
    manager.setPhase('B');
    manager.setPhase('B');
    expect(manager.getState().game.phase).toBe('B');
    expect(received).toEqual(['B']);
  });

  it('persists mail read and star state through the dedicated APIs and emits mail-opened', () => {
    const opened: string[] = [];
    bus.on('mail:opened', ({ mailId }) => opened.push(mailId));
    manager.markMailRead('MAIL_A1_C_001');
    manager.markMailRead('MAIL_A1_C_001');
    manager.toggleMailStarred('MAIL_A1_C_001');
    expect(manager.getState().modules.mail.readIds).toEqual(['MAIL_A1_C_001']);
    expect(manager.getState().modules.mail.starredIds).toContain('MAIL_A1_C_001');
    expect(opened).toEqual(['MAIL_A1_C_001', 'MAIL_A1_C_001']);
    manager.toggleMailStarred('MAIL_A1_C_001');
    expect(manager.getState().modules.mail.starredIds).not.toContain('MAIL_A1_C_001');
  });

  it('uses public APIs to persist deduplicated browser and notepad module data', () => {
    const searched: string[] = []; const opened: string[] = []; const notes: string[] = [];
    bus.on('browser:searched', ({ query }) => searched.push(query));
    bus.on('browser:page-opened', ({ pageId }) => opened.push(pageId));
    bus.on('notepad:auto-entry-added', ({ entryId }) => notes.push(entryId));
    manager.recordBrowserSearch('鸡公岭'); manager.recordBrowserSearch('XX县失踪'); manager.recordBrowserSearch('鸡公岭');
    manager.recordBrowserPageVisit('PAGE_A1_E_001'); manager.recordBrowserPageVisit('PAGE_A1_E_001');
    manager.setNotepadUserText('待确认'); manager.addNotepadAutoEntry('NOTE_A1_E_001'); manager.addNotepadAutoEntry('NOTE_A1_E_001');
    expect(manager.getState().modules.browser.queryHistory).toEqual(['鸡公岭', 'XX县失踪']);
    expect(manager.getState().modules.browser.visitedPageIds).toEqual(['PAGE_A1_E_001']);
    expect(manager.getState().modules.notepad).toEqual({ userText: '待确认', autoEntryIds: ['NOTE_A1_E_001'] });
    expect(searched).toEqual(['鸡公岭', 'XX县失踪', '鸡公岭']); expect(opened).toEqual(['PAGE_A1_E_001', 'PAGE_A1_E_001']); expect(notes).toEqual(['NOTE_A1_E_001']);
  });

  it('stores deduplicated scene events only through public scene APIs', () => {
    const events: string[] = [];
    bus.on('journey:started', () => events.push('started'));
    bus.on('scene:hotspot-inspected', () => events.push('inspected'));
    const state = createDefaultState(); state.game.phase = 'F';
    manager = new StateManager(bus, state);
    manager.startJourney('SCENE_A1_G_001'); manager.startJourney('SCENE_A1_G_001');
    manager.inspectSceneHotspot('HOTSPOT_A1_G_001'); manager.inspectSceneHotspot('HOTSPOT_A1_G_001');
    expect(manager.getState().modules.scene).toMatchObject({ journeyStarted: true, currentSceneId: 'SCENE_A1_G_001', visitedSceneIds: ['SCENE_A1_G_001'], inspectedHotspotIds: ['HOTSPOT_A1_G_001'] });
    expect(events).toEqual(['started', 'inspected']);
  });

  it('resets every persisted progress domain to a fresh initial state', () => {
    const resets: number[] = [];
    bus.on('progress:reset', ({ schemaVersion }) => resets.push(schemaVersion));
    manager.openApp('mail');
    manager.setFlag('FLAG_TEST', true);
    manager.recordBrowserSearch('鸡公岭');
    manager.setNotepadUserText('临时记录');
    manager.resetProgress();
    expect(manager.getState()).toEqual(createDefaultState());
    expect(resets).toEqual([1]);
  });
});
