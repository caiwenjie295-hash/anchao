import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EventBus } from './eventBus';
import { createDefaultState } from './defaultState';
import { loadState } from './saveManager';
import { StateManager, stateManager } from './stateManager';
import type { Act2ActiveStage, HeibumuNamePart } from './types';
import { Act1Ending } from '../scenes/act1/Act1Ending';

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
    expect(resets).toEqual([7]);
  });

  it('acknowledges only the current story card and persists the choice', () => {
    manager.acknowledgeStoryTransition('TRANSITION_A2_T06');
    expect(manager.getState().modules.storyTransitions.seenIds).toEqual([]);
    manager.acknowledgeStoryTransition('TRANSITION_A1_INTRO');
    manager.acknowledgeStoryTransition('TRANSITION_A1_INTRO');
    expect(manager.getState().modules.storyTransitions.seenIds).toEqual(['TRANSITION_A1_INTRO']);
    expect(JSON.parse(localStorage.getItem('anchao.save.v1') ?? '{}').modules.storyTransitions.seenIds).toEqual(['TRANSITION_A1_INTRO']);
    manager.resetProgress();
    expect(manager.getState().modules.storyTransitions.seenIds).toEqual([]);
  });
});

describe('StateManager second-act foundation', () => {
  let bus: EventBus;
  let manager: StateManager;

  beforeEach(() => {
    localStorage.clear();
    bus = new EventBus();
    manager = new StateManager(bus, createDefaultState());
  });

  /** 第一幕已完成的桌面，用于检查入口门槛。 */
  const completedAct1Manager = (): StateManager => {
    const state = createDefaultState();
    state.game.phase = 'K';
    state.game.flags = { FLAG_A1_COMPLETE: true, FLAG_A1_SS_FOUND: true };
    return new StateManager(bus, state);
  };

  const runToBridge = (instance: StateManager): void => {
    instance.startSecondAct();
    instance.setAct2Stage('bridge');
  };

  const runToLibrary = (instance: StateManager): void => {
    runToBridge(instance);
    instance.setAct2Stage('library');
    instance.visitGazetteSection('SECTION_A2_T03_001');
  };

  const solveName = (instance: StateManager): void => {
    runToBridge(instance);
    instance.showAct2Evidence('IMG_A1_I_002');
    instance.setHeibumuNameChoice('first', '黑');
    instance.setHeibumuNameChoice('middle', '补');
    instance.setHeibumuNameChoice('last', '母');
    instance.confirmHeibumuName();
  };

  it('does not start the second act before the first act is complete', () => {
    const started: string[] = [];
    bus.on('act2:started', () => started.push('started'));
    manager.startSecondAct();
    expect(manager.getState().game.act).toBe(1);
    expect(manager.getState().game.phase).toBe('A');
    expect(manager.getState().modules.act2Research.stage).toBe('inactive');
    expect(started).toEqual([]);
  });

  it('starts the second act once and keeps every first-act record', () => {
    const state = createDefaultState();
    state.game.phase = 'K';
    state.game.flags = { FLAG_A1_COMPLETE: true, FLAG_A1_SS_FOUND: true };
    state.modules.mail = { readIds: ['MAIL_A1_C_001'], starredIds: ['MAIL_A1_C_001'] };
    state.modules.browser.queryHistory = ['鸡公岭'];
    state.modules.notepad.userText = '此前记录';
    state.modules.scene.capturedPhotoIds = ['IMG_A1_H_003', 'IMG_A1_I_004'];
    state.modules.photos.adjustments = { IMG_A1_H_003: { exposure: 55, shadows: 50, contrast: 35 } };
    manager = new StateManager(bus, state);
    const started: number[] = []; const phases: string[] = [];
    bus.on('act2:started', ({ act }) => started.push(act));
    bus.on('phase:changed', ({ phase }) => phases.push(phase));
    manager.startSecondAct();
    manager.startSecondAct();
    const next = manager.getState();
    expect(next.game.act).toBe(2);
    expect(next.game.phase).toBe('A2_T01');
    expect(next.modules.act2Research.stage).toBe('search');
    expect(next.game.flags).toEqual({ FLAG_A1_COMPLETE: true, FLAG_A1_SS_FOUND: true });
    expect(next.modules.mail).toEqual({ readIds: ['MAIL_A1_C_001'], starredIds: ['MAIL_A1_C_001'] });
    expect(next.modules.browser.queryHistory).toEqual(['鸡公岭']);
    expect(next.modules.notepad.userText).toBe('此前记录');
    expect(next.modules.scene.capturedPhotoIds).toEqual(['IMG_A1_H_003', 'IMG_A1_I_004']);
    expect(next.modules.photos.adjustments.IMG_A1_H_003).toEqual({ exposure: 55, shadows: 50, contrast: 35 });
    expect(started).toEqual([2]);
    expect(phases).toEqual(['A2_T01']);
  });

  it('advances the second-act stage forwards only', () => {
    manager = completedAct1Manager();
    const stages: string[] = []; const phases: string[] = [];
    bus.on('act2:stage-changed', ({ stage }) => stages.push(stage));
    bus.on('phase:changed', ({ phase }) => phases.push(phase));
    manager.setAct2Stage('bridge');
    expect(manager.getState().modules.act2Research.stage).toBe('inactive');
    manager.startSecondAct();
    manager.setAct2Stage('nowhere' as Act2ActiveStage);
    manager.setAct2Stage('search');
    manager.setAct2Stage('bridge');
    manager.setAct2Stage('library');
    manager.setAct2Stage('bridge');
    expect(manager.getState().modules.act2Research.stage).toBe('library');
    expect(manager.getState().game.phase).toBe('A2_T03');
    expect(stages).toEqual(['bridge', 'library']);
    expect(phases).toEqual(['A2_T01', 'A2_T02', 'A2_T03']);
  });

  it('gates elder conversations behind the bridge stage and never repeats an elder', () => {
    manager = completedAct1Manager();
    const talked: string[] = [];
    bus.on('act2:elder-talked', ({ elderId }) => talked.push(elderId));
    manager.talkToAct2Elder('ELDER_A2_T02_001');
    manager.startSecondAct();
    manager.talkToAct2Elder('ELDER_A2_T02_001');
    manager.setAct2Stage('bridge');
    manager.talkToAct2Elder('   ');
    manager.talkToAct2Elder('ELDER_A2_T02_001');
    manager.talkToAct2Elder('ELDER_A2_T02_001');
    manager.talkToAct2Elder('ELDER_A2_T02_002');
    expect(manager.getState().modules.act2Research.bridge.talkedElderIds).toEqual(['ELDER_A2_T02_001', 'ELDER_A2_T02_002']);
    expect(talked).toEqual(['ELDER_A2_T02_001', 'ELDER_A2_T02_002']);
  });

  it('accepts only the frozen evidence set and marks the phrase heard once', () => {
    manager = completedAct1Manager();
    const shown: string[] = [];
    bus.on('act2:evidence-shown', ({ assetId }) => shown.push(assetId));
    manager.setAct2Stage('bridge');
    manager.showAct2Evidence('IMG_A1_I_001');
    manager.startSecondAct();
    manager.showAct2Evidence('IMG_A1_I_001');
    manager.setAct2Stage('bridge');
    manager.showAct2Evidence('   ');
    manager.showAct2Evidence('IMG_A1_X_999');
    manager.showAct2Evidence('IMG_A1_I_001');
    expect(manager.getState().modules.act2Research.bridge).toMatchObject({ shownEvidenceAssetIds: ['IMG_A1_I_001'], heardPhrase: true });
    manager.showAct2Evidence('IMG_A1_I_001');
    manager.showAct2Evidence('IMG_A1_I_003');
    expect(manager.getState().modules.act2Research.bridge.shownEvidenceAssetIds).toEqual(['IMG_A1_I_001', 'IMG_A1_I_003']);
    expect(shown).toEqual(['IMG_A1_I_001', 'IMG_A1_I_003']);
  });

  it('records the name choices after the phrase was heard and solves 黑补母 exactly once', () => {
    manager = completedAct1Manager();
    const solved: string[] = [];
    bus.on('act2:name-solved', ({ name }) => solved.push(name));
    manager.setAct2Stage('bridge');
    manager.setHeibumuNameChoice('first', '黑');
    manager.startSecondAct();
    manager.setAct2Stage('bridge');
    manager.setHeibumuNameChoice('first', '黑');
    expect(manager.getState().modules.act2Research.bridge.nameChoices).toEqual({ first: null, middle: null, last: null });
    manager.showAct2Evidence('IMG_A1_I_002');
    manager.setHeibumuNameChoice('nowhere' as HeibumuNamePart, '黑');
    manager.setHeibumuNameChoice('first', '   ');
    manager.setHeibumuNameChoice('first', '嘿');
    manager.setHeibumuNameChoice('first', '黑');
    manager.setHeibumuNameChoice('first', '黑');
    manager.setHeibumuNameChoice('middle', '捕');
    manager.setHeibumuNameChoice('last', '木');
    manager.confirmHeibumuName();
    expect(solved).toEqual([]);
    expect(manager.getState().game.flags.FLAG_A2_HEIBUMU_NAME_SOLVED).not.toBe(true);
    manager.setHeibumuNameChoice('middle', '补');
    manager.setHeibumuNameChoice('last', '母');
    manager.confirmHeibumuName();
    manager.confirmHeibumuName();
    expect(manager.getState().modules.act2Research.bridge.nameChoices).toEqual({ first: '黑', middle: '补', last: '母' });
    expect(manager.getState().game.flags.FLAG_A2_HEIBUMU_NAME_SOLVED).toBe(true);
    expect(solved).toEqual(['黑补母']);
  });

  it('gates the gazette reading chain and records every library action once', () => {
    manager = completedAct1Manager();
    const sections: string[] = []; const volumes: string[] = []; const pages: string[] = [];
    const keywords: string[] = []; const excerpts: string[] = [];
    bus.on('act2:gazette-section-visited', ({ sectionId }) => sections.push(sectionId));
    bus.on('act2:gazette-volume-opened', ({ volumeId }) => volumes.push(volumeId));
    bus.on('act2:gazette-page-opened', ({ pageId }) => pages.push(pageId));
    bus.on('act2:gazette-keyword-marked', ({ keywordId }) => keywords.push(keywordId));
    bus.on('act2:gazette-entry-excerpted', ({ entryId }) => excerpts.push(entryId));
    runToBridge(manager);
    manager.visitGazetteSection('SECTION_A2_T03_001');
    manager.setAct2Stage('library');
    manager.openGazetteVolume('VOLUME_A2_T03_001');
    manager.openGazettePage('PAGE_A2_T03_001');
    manager.visitGazetteSection('SECTION_A2_T03_001');
    manager.visitGazetteSection('SECTION_A2_T03_001');
    manager.openGazetteVolume('VOLUME_A2_T03_001');
    manager.openGazetteVolume('VOLUME_A2_T03_001');
    manager.markGazetteKeyword('KEYWORD_A2_T03_000');
    manager.excerptGazetteEntry('ENTRY_A2_T03_000');
    manager.openGazettePage('PAGE_A2_T03_001');
    manager.openGazettePage('PAGE_A2_T03_002');
    manager.openGazettePage('PAGE_A2_T03_002');
    manager.toggleGazetteBookmark('PAGE_A2_T03_001');
    manager.toggleGazetteBookmark('PAGE_A2_T03_002');
    manager.markGazetteKeyword('KEYWORD_A2_T03_001');
    manager.markGazetteKeyword('KEYWORD_A2_T03_001');
    manager.excerptGazetteEntry('ENTRY_A2_T03_001');
    manager.excerptGazetteEntry('ENTRY_A2_T03_001');
    manager.toggleGazetteBookmark('PAGE_A2_T03_002');
    expect(manager.getState().modules.act2Research.library).toEqual({
      visitedSectionIds: ['SECTION_A2_T03_001'],
      openedVolumeIds: ['VOLUME_A2_T03_001'],
      currentPageId: 'PAGE_A2_T03_002',
      bookmarkedPageIds: [],
      markedKeywordIds: ['KEYWORD_A2_T03_001'],
      excerptedEntryIds: ['ENTRY_A2_T03_001'],
    });
    expect(sections).toEqual(['SECTION_A2_T03_001']);
    expect(volumes).toEqual(['VOLUME_A2_T03_001']);
    expect(pages).toEqual(['PAGE_A2_T03_001', 'PAGE_A2_T03_002']);
    expect(keywords).toEqual(['KEYWORD_A2_T03_001']);
    expect(excerpts).toEqual(['ENTRY_A2_T03_001']);
  });

  it('keeps second-act research state across save and reload', () => {
    manager = completedAct1Manager();
    solveName(manager);
    manager.setAct2Stage('library');
    manager.visitGazetteSection('SECTION_A2_T03_001');
    manager.openGazetteVolume('VOLUME_A2_T03_001');
    manager.openGazettePage('PAGE_A2_T03_004');
    manager.markGazetteKeyword('KEYWORD_A2_T03_001');
    manager.excerptGazetteEntry('ENTRY_A2_T03_001');
    const saved = manager.getState();
    const restored = new StateManager(bus, loadState()).getState();
    expect(restored).toEqual(saved);
    expect(restored.modules.act2Research.bridge.heardPhrase).toBe(true);
    expect(restored.modules.act2Research.library.currentPageId).toBe('PAGE_A2_T03_004');
  });

  it('resets the second act back to a fresh first-act state', () => {
    manager = completedAct1Manager();
    solveName(manager);
    runToLibrary(manager);
    manager.openGazetteVolume('VOLUME_A2_T03_001');
    manager.resetProgress();
    expect(manager.getState()).toEqual(createDefaultState());
    expect(manager.getState().modules.act2Research.stage).toBe('inactive');
    expect(manager.getState().game.act).toBe(1);
  });

  it('keeps T04 tale reading, collection, sorting and inference idempotent', () => {
    manager = completedAct1Manager();
    manager.startSecondAct(); manager.setAct2Stage('bridge'); manager.setAct2Stage('library');
    manager.setFlag('FLAG_A2_BUMU_RULE_BASIC_KNOWN', true);
    manager.setAct2Stage('tales');
    manager.readAct2Tale('TALE_A2_T04_001'); manager.readAct2Tale('TALE_A2_T04_001');
    manager.collectAct2Tale('TALE_A2_T04_002');
    manager.collectAct2Tale('TALE_A2_T04_001'); manager.collectAct2Tale('TALE_A2_T04_001');
    expect(manager.getState().modules.act2Research.tales.readTaleIds).toEqual(['TALE_A2_T04_001']);
    expect(manager.getState().modules.act2Research.tales.collectedTaleIds).toEqual(['TALE_A2_T04_001']);
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T04_001']);
    manager.readAct2Tale('TALE_A2_T04_002'); manager.readAct2Tale('TALE_A2_T04_003');
    manager.collectAct2Tale('TALE_A2_T04_002'); manager.collectAct2Tale('TALE_A2_T04_003');
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T04_001', 'NOTE_A2_T04_002', 'NOTE_A2_T04_003']);
    for (let index = 1; index <= 12; index += 1) manager.placeAct2TaleCard(`CARD_A2_T04_${String(index).padStart(3, '0')}`);
    manager.finishAct2TaleSorting(); manager.finishAct2TaleSorting();
    manager.acknowledgeAct2TransferInference(); manager.acknowledgeAct2TransferInference();
    expect(manager.getState().modules.act2Research.tales).toMatchObject({ placedCardIds: expect.arrayContaining(['CARD_A2_T04_012']), sorted: true, inferenceAcknowledged: true });
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T04_004');
  });
});

describe('StateManager T05 school investigation', () => {
  let bus: EventBus;
  let manager: StateManager;

  beforeEach(() => {
    localStorage.clear();
    bus = new EventBus();
    const state = createDefaultState();
    state.game.act = 2;
    state.game.phase = 'A2_T04';
    state.game.flags = { FLAG_A1_COMPLETE: true, FLAG_A1_SS_FOUND: true, FLAG_A2_TRANSFER_RULE_INFERRED: true };
    state.modules.act2Research.stage = 'tales';
    manager = new StateManager(bus, state);
  });

  it('enters school only from an inferred T04 and cannot be bypassed through setAct2Stage', () => {
    const entered: number[] = [];
    bus.on('act2:school-entered', () => entered.push(1));
    manager.setAct2Stage('school' as Act2ActiveStage);
    expect(manager.getState().modules.act2Research.stage).toBe('tales');
    manager.getState().game.flags.FLAG_A2_TRANSFER_RULE_INFERRED = false;
    manager.enterAct2School();
    expect(manager.getState().modules.act2Research.stage).toBe('tales');
    manager.getState().game.flags.FLAG_A2_TRANSFER_RULE_INFERRED = true;
    manager.enterAct2School();
    manager.enterAct2School();
    expect(manager.getState().modules.act2Research.stage).toBe('school');
    expect(manager.getState().game.phase).toBe('A2_T05');
    expect(manager.getState().game.flags.FLAG_A2_SCHOOL_ENTERED).toBe(true);
    expect(entered).toEqual([1]);
  });

  it('records known school areas and evidence idempotently, with the hydrant outside puzzle progress', () => {
    manager.enterAct2School();
    const areas: string[] = []; const hotspots: string[] = [];
    bus.on('act2:school-area-visited', ({ areaId }) => areas.push(areaId));
    bus.on('act2:school-hotspot-inspected', ({ hotspotId }) => hotspots.push(hotspotId));
    manager.visitAct2SchoolArea('AREA_A2_T05_RESTROOM_APPROACH');
    expect(manager.getState().game.flags.FLAG_A2_FIRE_HYDRANT_SEEN).not.toBe(true);
    manager.visitAct2SchoolArea('AREA_A2_T05_CORRIDOR');
    manager.visitAct2SchoolArea('AREA_A2_T05_CORRIDOR');
    manager.visitAct2SchoolArea('AREA_A2_T05_UNKNOWN');
    expect(manager.getState().game.flags.FLAG_A2_FIRE_HYDRANT_SEEN).toBe(true);
    expect(manager.getState().modules.act2Research.school.visitedAreaIds).toEqual(['AREA_A2_T05_RESTROOM_APPROACH', 'AREA_A2_T05_CORRIDOR']);
    expect(manager.getState().game.flags.FLAG_A2_SS_MATCH_CONFIRMED).not.toBe(true);
    manager.inspectAct2SchoolHotspot('HOTSPOT_A2_T05_TEACHER');
    expect(manager.getState().modules.act2Research.school.inspectedHotspotIds).toEqual([]);
    manager.visitAct2SchoolArea('AREA_A2_T05_TEACHER_OFFICE');
    manager.inspectAct2SchoolHotspot('HOTSPOT_A2_T05_TEACHER');
    manager.inspectAct2SchoolHotspot('HOTSPOT_A2_T05_TEACHER');
    expect(areas).toEqual(['AREA_A2_T05_RESTROOM_APPROACH', 'AREA_A2_T05_CORRIDOR', 'AREA_A2_T05_TEACHER_OFFICE']);
    expect(hotspots).toEqual(['HOTSPOT_A2_T05_TEACHER']);
    manager.acknowledgeAct2TeacherAccount(); manager.acknowledgeAct2TeacherAccount();
    expect(manager.getState().game.flags.FLAG_A2_LEAVE_OF_ABSENCE_KNOWN).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T05_001');
  });

  it('gates ranks, Qiming text and school double-S notes behind the corresponding inspected content', () => {
    manager.enterAct2School();
    manager.readAct2SchoolRanks(); manager.readAct2QimingTestimonial(); manager.inspectAct2SchoolNotebook();
    expect(manager.getState().game.flags.FLAG_A2_SCORE_CHANGE_KNOWN).not.toBe(true);
    expect(manager.getState().game.flags.FLAG_A2_QIMING_NAME_FOUND).not.toBe(true);
    expect(manager.getState().game.flags.FLAG_A2_SCHOOL_SS_FOUND).not.toBe(true);
    manager.visitAct2SchoolArea('AREA_A2_T05_HONOR_ROLL');
    manager.inspectAct2SchoolHotspot('HOTSPOT_A2_T05_RANKS');
    manager.readAct2SchoolRanks(); manager.readAct2SchoolRanks();
    manager.inspectAct2SchoolHotspot('HOTSPOT_A2_T05_QIMING_TEXT');
    manager.readAct2QimingTestimonial(); manager.readAct2QimingTestimonial();
    expect(manager.getState().game.flags.FLAG_A2_SCORE_CHANGE_KNOWN).toBe(true);
    expect(manager.getState().game.flags.FLAG_A2_QIMING_NAME_FOUND).toBe(true);
    manager.visitAct2SchoolArea('AREA_A2_T05_XIAOA_CLASSROOM');
    manager.inspectAct2SchoolHotspot('HOTSPOT_A2_T05_SCHOLAR_NOTE');
    manager.inspectAct2SchoolNotebook(); manager.inspectAct2SchoolNotebook();
    manager.confirmAct2SchoolSymbolMatch(); manager.confirmAct2SchoolSymbolMatch();
    expect(manager.getState().game.flags.FLAG_A2_SCHOOL_SS_FOUND).toBe(true);
    expect(manager.getState().game.flags.FLAG_A2_SS_MATCH_CONFIRMED).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds.filter((id) => id === 'NOTE_A2_T05_004')).toHaveLength(1);
  });
});

describe('StateManager T06 qiming research', () => {
  it('enters only with the T05 match and requires explicit comparisons plus both later cases', () => {
    const state = createDefaultState();
    state.modules.act2Research.stage = 'school';
    state.game.flags = { FLAG_A2_SCHOOL_ENTERED: true, FLAG_A2_TRANSFER_RULE_INFERRED: true, FLAG_A2_SS_MATCH_CONFIRMED: true };
    const bus = new EventBus(); const manager = new StateManager(bus, state); const entered: string[] = [];
    bus.on('act2:qiming-entered', () => entered.push('entered'));
    manager.enterAct2QimingResearch(); manager.enterAct2QimingResearch();
    expect(manager.getState().modules.act2Research.stage).toBe('qiming');
    expect(manager.getState().game.phase).toBe('A2_T06');
    expect(entered).toEqual(['entered']);
    manager.recordBrowserPageVisit('PAGE_A2_T06_004'); manager.recordBrowserPageVisit('PAGE_A2_T06_006');
    manager.setFlag('FLAG_A2_QIMING_TESTIMONIALS_READ', true); manager.setFlag('FLAG_A2_QIMING_FORUM_FOUND', true);
    manager.inferAct2QimingNameMatch('huang'); manager.inferAct2QimingNameMatch('huang');
    expect(manager.getState().game.flags.FLAG_A2_HUANG_MATCH_INFERRED).toBe(true);
    expect(manager.getState().game.flags.FLAG_A2_ZHONG_MATCH_INFERRED).not.toBe(true);
    manager.recordBrowserPageVisit('PAGE_A2_T06_008');
    manager.confirmAct2OtherCasesAbnormal();
    expect(manager.getState().game.flags.FLAG_A2_OTHER_CASES_ABNORMAL).not.toBe(true);
    manager.inferAct2QimingNameMatch('zhong');
    expect(manager.getState().game.flags.FLAG_A2_ZHONG_MATCH_INFERRED).not.toBe(true);
    manager.recordBrowserPageVisit('PAGE_A2_T06_007');
    manager.inferAct2QimingNameMatch('zhong');
    manager.confirmAct2OtherCasesAbnormal();
    expect(manager.getState().game.flags.FLAG_A2_OTHER_CASES_ABNORMAL).not.toBe(true);
    manager.recordBrowserPageVisit('PAGE_A2_T06_009'); manager.confirmAct2OtherCasesAbnormal();
    expect(manager.getState().game.flags.FLAG_A2_OTHER_CASES_ABNORMAL).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T06_004');
  });
});

describe('Act1Ending second-act entry', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    stateManager.resetProgress();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('starts the second act from the ending page and keeps every first-act record', async () => {
    stateManager.setFlag('FLAG_A1_COMPLETE', true);
    stateManager.setFlag('FLAG_A1_SS_FOUND', true);
    stateManager.recordBrowserSearch('鸡公岭');
    await act(async () => { root.render(createElement(Act1Ending)); });
    const button = container.querySelector('.act1-ending__continue') as HTMLButtonElement;
    expect(button.textContent).toBe('回到桌面，继续调查');
    await act(async () => { button.click(); });
    const state = stateManager.getState();
    expect(state.game.act).toBe(2);
    expect(state.game.phase).toBe('A2_T01');
    expect(state.modules.act2Research.stage).toBe('search');
    expect(state.game.flags).toEqual({ FLAG_A1_COMPLETE: true, FLAG_A1_SS_FOUND: true });
    expect(state.modules.browser.queryHistory).toEqual(['鸡公岭']);
  });

  it('does not start the second act while the first act is unfinished', async () => {
    await act(async () => { root.render(createElement(Act1Ending)); });
    await act(async () => { (container.querySelector('.act1-ending__continue') as HTMLButtonElement).click(); });
    expect(stateManager.getState().game.act).toBe(1);
    expect(stateManager.getState().game.phase).toBe('A');
    expect(stateManager.getState().modules.act2Research.stage).toBe('inactive');
  });
});
