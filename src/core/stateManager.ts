import { eventBus, type EventBus } from './eventBus';
import { createDefaultState } from './defaultState';
import { clearReadingUiState, importSaveText, readProtectedOriginalSave, readRecentSaveBackup, readSave, restoreRecentSaveBackup, writeSaveState, type SaveImportResult, type SaveReadResult, type SaveRecoveryWriteOptions, type SaveWriteFailureReason } from './saveManager';
import type { Act2ActiveStage, Act2QimingCaseId, Act2QimingConclusionId, Act2QimingNicknameAssessment, Act2SchoolEvidenceId, Act2SchoolInferenceId, Act4Stage, AppId, AppState, Bounds, GamePhase, HeibumuNamePart } from './types';
import type { SaveStoragePort } from './persistence/browserStorage';
import { openApp as openAppDomain, focusWindow as focusWindowDomain, closeWindow as closeWindowDomain, minimizeWindow as minimizeWindowDomain, toggleTaskbarApp as toggleTaskbarAppDomain, toggleMaximize as toggleMaximizeDomain, setBounds as setBoundsDomain } from './domain/desktop';
import { setFlag as setFlagDomain, setPhase as setPhaseDomain, acknowledgeStoryTransition as acknowledgeStoryTransitionDomain, markMailRead as markMailReadDomain, toggleMailStarred as toggleMailStarredDomain, recordBrowserSearch as recordBrowserSearchDomain, recordBrowserPageVisit as recordBrowserPageVisitDomain, setNotepadUserText as setNotepadUserTextDomain, addNotepadAutoEntry as addNotepadAutoEntryDomain, resetProgress as resetProgressDomain } from './domain/applications';
import type { DomainTransition } from './domain/transitions';
import type { DomainPlan } from './domain/plans';
import { reconcileAct2BridgeProgress as reconcileAct2BridgeProgressDomain } from './domain/act2Bridge';
import { startJourney as startJourneyDomain, enterScene as enterSceneDomain, inspectSceneHotspot as inspectSceneHotspotDomain, captureScenePhoto as captureScenePhotoDomain, finishJourney as finishJourneyDomain, openPhotoEditor as openPhotoEditorDomain, setPhotoAdjustment as setPhotoAdjustmentDomain, inspectPhotoSymbol as inspectPhotoSymbolDomain, setPhotoZoom as setPhotoZoomDomain, finishFirstAct as finishFirstActDomain } from './domain/act1';
import {
 startSecondAct as startSecondActDomain, setStage as setAct2StageDomain, talkToElder as talkToAct2ElderDomain, showEvidence as showAct2EvidenceDomain, setNameChoice as setHeibumuNameChoiceDomain, confirmName as confirmHeibumuNameDomain,
 visitGazetteSection as visitGazetteSectionDomain, openGazetteVolume as openGazetteVolumeDomain, openGazettePage as openGazettePageDomain, readGazetteTargetPage as readAct2GazetteTargetPageDomain, toggleGazetteBookmark as toggleGazetteBookmarkDomain, markGazetteKeyword as markGazetteKeywordDomain, excerptGazetteEntry as excerptGazetteEntryDomain,
 readTale as readAct2TaleDomain, collectTale as collectAct2TaleDomain, toggleTaleEvidence as toggleAct2TaleEvidenceDomain, selectTaleInference as selectAct2TaleInferenceDomain, inferTransferPattern as inferAct2TransferPatternDomain, placeTaleCard as placeAct2TaleCardDomain, finishTaleSorting as finishAct2TaleSortingDomain, acknowledgeTransferInference as acknowledgeAct2TransferInferenceDomain,
 enterSchool as enterAct2SchoolDomain, enterQimingResearch as enterAct2QimingResearchDomain, inferQimingNameMatch as inferAct2QimingNameMatchDomain, recordQimingNicknameAssessment as recordAct2QimingNicknameAssessmentDomain, reviewQimingCase as reviewAct2QimingCaseDomain, visitSchoolArea as visitAct2SchoolAreaDomain, inspectSchoolHotspot as inspectAct2SchoolHotspotDomain, acknowledgeTeacherAccount as acknowledgeAct2TeacherAccountDomain, readSchoolRanks as readAct2SchoolRanksDomain, readQimingTestimonial as readAct2QimingTestimonialDomain, inspectSchoolNotebook as inspectAct2SchoolNotebookDomain, confirmSchoolSymbolMatch as confirmAct2SchoolSymbolMatchDomain, toggleSchoolEvidence as toggleAct2SchoolEvidenceDomain, selectSchoolInference as selectAct2SchoolInferenceDomain, confirmSchoolTimeline as confirmAct2SchoolTimelineDomain,
 enterFinaleInvestigation as enterAct2FinaleInvestigationDomain, viewT07Material as viewAct2T07MaterialDomain, markT07SegmentPlayed as markAct2T07SegmentPlayedDomain, captureT07Frame as captureAct2T07FrameDomain, compareT07TempleFrame as compareAct2T07TempleFrameDomain, submitT07Comparison as submitAct2T07ComparisonDomain, confirmT07TempleFrame as confirmAct2T07TempleFrameDomain, confirmT07PhotoSymbol as confirmAct2T07PhotoSymbolDomain, inferT07Location as inferAct2T07LocationDomain, planT07SecondTrip as planAct2T07SecondTripDomain, completeT07Finale as completeAct2T07FinaleDomain
} from './domain/act2';
import type { Act2QimingCaseReviewResult } from './domain/act2';
export type { Act2QimingCaseReviewResult } from './domain/act2';
import { startAct3 as startAct3Domain, enterAct3Lens as enterAct3LensDomain, inspectAct3Clue as inspectAct3ClueDomain, confirmAct3Stage as confirmAct3StageDomain, advanceAct3Stage as advanceAct3StageDomain, leaveAct3Stage as leaveAct3StageDomain, startAct4 as startAct4Domain } from './domain/act3';
import { readNotebookPage as readAct4NotebookPageDomain, checkOldMail as checkAct4OldMailDomain, solvePuzzle as solveAct4PuzzleDomain, loginAccounts as loginAct4AccountsDomain, readTimeline as readAct4TimelineDomain, confirmBroadcastPeriod as confirmAct4BroadcastPeriodDomain, visitBirthdayNode as visitAct4BirthdayNodeDomain, visitLaterNode as visitAct4LaterNodeDomain, advancePackage as advanceAct4PackageDomain, advanceBroadcast as advanceAct4BroadcastDomain, completeNarrativeAction as completeAct4NarrativeActionDomain, advanceNarrativeSection as advanceAct4NarrativeSectionDomain } from './domain/act4';
type StateListener = () => void;
export type SaveStatus = 'saved' | 'saving' | 'unavailable' | 'recovery-required';

export type SaveRecoveryState =
  | { kind: 'none' }
  | { kind: 'device-save-available'; savedSaveText: string; originalText?: string; backupAvailable: boolean; protectedOriginalText: string | null }
  | { kind: 'backup-only'; backupAvailable: true; protectedOriginalText: string | null }
  | { kind: 'corrupt'; originalText: string; backupAvailable: boolean; protectedOriginalText: string | null }
  | { kind: 'unsupported-version'; originalText: string; version: number; backupAvailable: boolean; protectedOriginalText: string | null }
  | { kind: 'unavailable'; originalText?: string; backupAvailable: boolean; protectedOriginalText: string | null };

export type SaveRecoveryActionResult = { ok: true } | { ok: false; reason: SaveWriteFailureReason | 'backup-not-found' | 'device-save-available' | 'device-save-changed' };

const noSaveRecovery: SaveRecoveryState = Object.freeze({ kind: 'none' });

function recoverySnapshot(result: SaveReadResult, storage?: SaveStoragePort): SaveRecoveryState {
  const backup = readRecentSaveBackup(storage);
  const protectedOriginalText = readProtectedOriginalSave(storage);
  const backupAvailable = backup.kind === 'loaded';
  if (result.kind === 'empty') return backupAvailable ? { kind: 'backup-only', backupAvailable: true, protectedOriginalText } : noSaveRecovery;
  if (result.kind === 'loaded') return noSaveRecovery;
  if (result.kind === 'corrupt') return { kind: 'corrupt', originalText: result.raw, backupAvailable, protectedOriginalText };
  if (result.kind === 'unsupported-version') return { kind: 'unsupported-version', originalText: result.raw, version: result.version, backupAvailable, protectedOriginalText };
  return { kind: 'unavailable', ...(result.raw === undefined ? {} : { originalText: result.raw }), backupAvailable, protectedOriginalText };
}

const pendingSaveFlushers = new Set<() => void>();
let lifecycleFlushInstalled = false;

function flushPendingSaves(): void {
  pendingSaveFlushers.forEach((flush) => flush());
}

function installSaveLifecycleFlush(): void {
  if (lifecycleFlushInstalled || typeof window === 'undefined' || typeof document === 'undefined') return;
  lifecycleFlushInstalled = true;
  window.addEventListener('pagehide', flushPendingSaves);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingSaves();
  });
}

const viewportBounds = (): Bounds => ({
  x: 0,
  y: 0,
  width: Math.max(320, typeof window === 'undefined' ? 1366 : window.innerWidth),
  height: Math.max(240, (typeof window === 'undefined' ? 768 : window.innerHeight) - 64),
});

export class StateManager {
  private state: AppState;
  private subscribers = new Set<StateListener>();
  private saveStatus = 'saved' as SaveStatus;
  private saveStatusSubscribers = new Set<StateListener>();
  private recoveryState: SaveRecoveryState = noSaveRecovery;
  private recoveryStateSubscribers = new Set<StateListener>();
  private pendingSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly flushForLifecycle = () => this.flushPendingSave();

  constructor(private readonly bus: EventBus = eventBus, initialState?: AppState, private readonly storage?: SaveStoragePort) {
    if (initialState) {
      this.state = initialState;
      return;
    }
    const result = readSave(storage);
    this.state = result.kind === 'loaded' ? result.state : createDefaultState();
    this.recoveryState = recoverySnapshot(result, storage);
    if (this.recoveryState.kind !== 'none') this.saveStatus = this.recoveryState.kind === 'unavailable' ? 'unavailable' : 'recovery-required';
  }

  getState = (): AppState => this.state;

  subscribe = (listener: StateListener): (() => void) => {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  };

  getSaveStatus = (): SaveStatus => this.saveStatus;

  subscribeSaveStatus = (listener: StateListener): (() => void) => {
    this.saveStatusSubscribers.add(listener);
    return () => this.saveStatusSubscribers.delete(listener);
  };

  getRecoveryState = (): SaveRecoveryState => this.recoveryState;

  subscribeRecoveryState = (listener: StateListener): (() => void) => {
    this.recoveryStateSubscribers.add(listener);
    return () => this.recoveryStateSubscribers.delete(listener);
  };

  private setRecoveryState(state: SaveRecoveryState): void {
    if (JSON.stringify(this.recoveryState) === JSON.stringify(state)) return;
    this.recoveryState = state;
    this.recoveryStateSubscribers.forEach((listener) => listener());
  }

  /** 订阅 flag:changed 事件，返回取消订阅函数。 */
  subscribeFlagChanged = (handler: (payload: { flagId: string; value: boolean | string | number }) => void): (() => void) => {
    return this.bus.on('flag:changed', handler);
  };

  private setSaveStatus(status: SaveStatus): void {
    if (this.saveStatus === status) return;
    this.saveStatus = status;
    this.saveStatusSubscribers.forEach((listener) => listener());
  }

  private cancelPendingSave(): void {
    if (this.pendingSaveTimer !== null) clearTimeout(this.pendingSaveTimer);
    this.pendingSaveTimer = null;
    pendingSaveFlushers.delete(this.flushForLifecycle);
  }

  private flushPendingSave(): void {
    if (this.pendingSaveTimer === null) return;
    this.cancelPendingSave();
    this.persistCurrentState();
  }

  private deferSave(): void {
    if (this.pendingSaveTimer !== null) clearTimeout(this.pendingSaveTimer);
    installSaveLifecycleFlush();
    pendingSaveFlushers.add(this.flushForLifecycle);
    this.setSaveStatus('saving');
    this.pendingSaveTimer = setTimeout(() => this.flushPendingSave(), 300);
  }

  private persistCurrentState(): void {
    if (this.recoveryState.kind !== 'none') {
      this.setSaveStatus(this.recoveryState.kind === 'unavailable' ? 'unavailable' : 'recovery-required');
      return;
    }
    const result = writeSaveState(this.state, this.storage);
    if (result.ok) {
      this.setSaveStatus('saved');
      this.bus.emit('save:completed', { schemaVersion: 13 });
    } else {
      if (result.recovery) {
        this.setRecoveryState(recoverySnapshot(result.recovery, this.storage));
      } else if (result.reason === 'storage-unavailable' || result.reason === 'backup-unavailable') {
        this.setRecoveryState(recoverySnapshot({ kind: 'unavailable' }, this.storage));
      }
      this.setSaveStatus(result.reason === 'recovery-required' || result.reason === 'recovery-slot-occupied' || result.reason === 'recovery-protection-failed'
        ? 'recovery-required'
        : 'unavailable');
    }
  }

  private commit(next: AppState, savePolicy: 'immediate' | 'deferred' = 'immediate'): void {
    this.state = next;
    this.subscribers.forEach((listener) => listener());
    if (this.recoveryState.kind !== 'none') {
      this.cancelPendingSave();
      this.setSaveStatus(this.recoveryState.kind === 'unavailable' ? 'unavailable' : 'recovery-required');
      return;
    }
    if (savePolicy === 'deferred') {
      this.deferSave();
      return;
    }
    this.cancelPendingSave();
    this.persistCurrentState();
  }

  private applyDomainTransition<Result>(transition: DomainTransition<Result>): Result {
    if (transition.commit) this.commit(transition.state, transition.savePolicy);
    const emit = this.bus.emit.bind(this.bus) as (eventName: keyof import('./types').AnchaoEventMap, payload: import('./types').AnchaoEventMap[keyof import('./types').AnchaoEventMap]) => void;
    for (const event of transition.events) emit(event.type, event.payload);
    return transition.result;
  }

  private applyDomainPlan<Result>(plan: DomainPlan<Result>): Result {
    for (const step of plan.steps) this.applyDomainTransition(step(this.state));
    return plan.result;
  }

  openApp(appId: AppId): void {
    this.applyDomainTransition(openAppDomain(this.state, appId));
  }

  focusWindow(appId: AppId): void {
    this.applyDomainTransition(focusWindowDomain(this.state, appId));
  }

  closeWindow(appId: AppId): void {
    this.applyDomainTransition(closeWindowDomain(this.state, appId));
  }

  minimizeWindow(appId: AppId): void {
    this.applyDomainTransition(minimizeWindowDomain(this.state, appId));
  }

  toggleTaskbarApp(appId: AppId): void {
    this.applyDomainTransition(toggleTaskbarAppDomain(this.state, appId));
  }

  toggleMaximize(appId: AppId): void {
    this.applyDomainTransition(toggleMaximizeDomain(this.state, appId, viewportBounds()));
  }

  setBounds(appId: AppId, bounds: Bounds): void {
    this.applyDomainTransition(setBoundsDomain(this.state, appId, bounds));
  }

  setFlag(flagId: string, value: boolean | string | number): void {
    this.applyDomainTransition(setFlagDomain(this.state, flagId, value));
  }

  setPhase(phase: GamePhase): void {
    this.applyDomainTransition(setPhaseDomain(this.state, phase));
  }

  acknowledgeStoryTransition(id: string): void {
    this.applyDomainTransition(acknowledgeStoryTransitionDomain(this.state, id));
  }

  markMailRead(mailId: string): void {
    this.applyDomainTransition(markMailReadDomain(this.state, mailId));
  }

  toggleMailStarred(mailId: string): void {
    this.applyDomainTransition(toggleMailStarredDomain(this.state, mailId));
  }

  recordBrowserSearch(query: string): void {
    this.applyDomainTransition(recordBrowserSearchDomain(this.state, query));
  }

  recordBrowserPageVisit(pageId: string): void {
    this.applyDomainTransition(recordBrowserPageVisitDomain(this.state, pageId));
  }

  setNotepadUserText(userText: string): void {
    this.applyDomainTransition(setNotepadUserTextDomain(this.state, userText));
  }

  addNotepadAutoEntry(entryId: string): void {
    this.applyDomainTransition(addNotepadAutoEntryDomain(this.state, entryId));
  }

  resetProgress(): void {
    if (this.recoveryState.kind !== 'none') return;
    this.cancelPendingSave();
    clearReadingUiState();
    this.applyDomainTransition(resetProgressDomain(this.state));
    this.bus.emit('progress:reset', { schemaVersion: 13 });
  }

  exportSave(): string {
    return JSON.stringify(this.state, null, 2);
  }

  exportOriginalSave(): string | null {
    return 'originalText' in this.recoveryState ? this.recoveryState.originalText ?? null : null;
  }

  exportProtectedOriginalSave(): string | null {
    return this.recoveryState.kind === 'none'
      ? readProtectedOriginalSave(this.storage)
      : this.recoveryState.protectedOriginalText ?? readProtectedOriginalSave(this.storage);
  }

  refreshSaveRecovery(options: SaveRecoveryWriteOptions = {}): SaveRecoveryActionResult {
    const result = readSave(this.storage);
    if (result.kind === 'loaded') {
      if (this.recoveryState.kind === 'none') return { ok: true };
      this.cancelPendingSave();
      this.setRecoveryState({
        kind: 'device-save-available',
        savedSaveText: JSON.stringify(result.state, null, 2),
        ...('originalText' in this.recoveryState && this.recoveryState.originalText !== undefined ? { originalText: this.recoveryState.originalText } : {}),
        backupAvailable: readRecentSaveBackup(this.storage).kind === 'loaded',
        protectedOriginalText: readProtectedOriginalSave(this.storage),
      });
      this.setSaveStatus('recovery-required');
      return { ok: false, reason: 'device-save-available' };
    }
    if (result.kind === 'empty' && this.recoveryState.kind !== 'none') {
      const write = writeSaveState(this.state, this.storage, {
        ...options,
        preserveOriginalText: this.exportOriginalSave() ?? undefined,
      });
      if (write.ok) {
        this.cancelPendingSave();
        this.setRecoveryState(noSaveRecovery);
        this.setSaveStatus('saved');
        this.bus.emit('save:completed', { schemaVersion: 13 });
        return { ok: true };
      }
      if (write.recovery) this.setRecoveryState(recoverySnapshot(write.recovery, this.storage));
      else {
        const originalText = this.exportOriginalSave();
        this.setRecoveryState(recoverySnapshot({ kind: 'unavailable', ...(originalText === null ? {} : { raw: originalText }) }, this.storage));
      }
      this.setSaveStatus(write.reason === 'recovery-slot-occupied' || write.reason === 'recovery-protection-failed' || write.reason === 'recovery-required'
        ? 'recovery-required'
        : 'unavailable');
      return { ok: false, reason: write.reason };
    }
    const snapshot = recoverySnapshot(result, this.storage);
    if (snapshot.kind !== 'none') this.cancelPendingSave();
    this.setRecoveryState(snapshot);
    this.setSaveStatus(snapshot.kind === 'unavailable' ? 'unavailable' : snapshot.kind === 'none' ? 'saved' : 'recovery-required');
    return { ok: false, reason: result.kind === 'unavailable' ? 'storage-unavailable' : 'recovery-required' };
  }

  adoptAvailableSave(options: SaveRecoveryWriteOptions = {}): SaveRecoveryActionResult {
    if (this.recoveryState.kind !== 'device-save-available') return { ok: false, reason: 'device-save-changed' };
    const savedSaveText = this.recoveryState.savedSaveText;
    const result = readSave(this.storage);
    if (result.kind !== 'loaded') {
      this.setRecoveryState(recoverySnapshot(result, this.storage));
      this.setSaveStatus(result.kind === 'unavailable' ? 'unavailable' : 'recovery-required');
      return { ok: false, reason: result.kind === 'unavailable' ? 'storage-unavailable' : 'device-save-changed' };
    }
    const currentSaveText = JSON.stringify(result.state, null, 2);
    if (currentSaveText !== savedSaveText) {
      this.setRecoveryState({ ...this.recoveryState, savedSaveText: currentSaveText, backupAvailable: readRecentSaveBackup(this.storage).kind === 'loaded' });
      this.setSaveStatus('recovery-required');
      return { ok: false, reason: 'device-save-changed' };
    }
    const originalText = this.recoveryState.originalText;
    if (originalText !== undefined) {
      const write = writeSaveState(result.state, this.storage, { ...options, preserveOriginalText: originalText });
      if (!write.ok) {
        this.setSaveStatus(write.reason === 'recovery-slot-occupied' || write.reason === 'recovery-protection-failed' ? 'recovery-required' : 'unavailable');
        return { ok: false, reason: write.reason };
      }
    }
    this.cancelPendingSave();
    clearReadingUiState();
    this.state = result.state;
    this.subscribers.forEach((listener) => listener());
    this.setRecoveryState(noSaveRecovery);
    this.setSaveStatus('saved');
    this.bus.emit('save:completed', { schemaVersion: 13 });
    this.bus.emit('save:imported', { schemaVersion: 13 });
    return { ok: true };
  }

  restoreSaveBackup(options: SaveRecoveryWriteOptions = {}): SaveRecoveryActionResult {
    this.cancelPendingSave();
    const result = restoreRecentSaveBackup(this.storage, { ...options, preserveOriginalText: this.exportOriginalSave() ?? undefined });
    if (!result.ok) {
      this.setSaveStatus(result.reason === 'recovery-slot-occupied' || result.reason === 'recovery-protection-failed' ? 'recovery-required' : 'unavailable');
      this.setRecoveryState(recoverySnapshot(readSave(this.storage), this.storage));
      return { ok: false, reason: result.reason };
    }
    this.state = result.state;
    this.subscribers.forEach((listener) => listener());
    this.setRecoveryState(noSaveRecovery);
    this.setSaveStatus('saved');
    this.bus.emit('save:completed', { schemaVersion: 13 });
    this.bus.emit('save:imported', { schemaVersion: 13 });
    return { ok: true };
  }

  restartFromRecovery(options: SaveRecoveryWriteOptions = {}): SaveRecoveryActionResult {
    if (this.recoveryState.kind === 'none') return { ok: false, reason: 'recovery-required' };
    this.cancelPendingSave();
    const state = createDefaultState();
    const result = writeSaveState(state, this.storage, { ...options, preserveOriginalText: this.exportOriginalSave() ?? undefined, allowInvalidOverwrite: true });
    if (!result.ok) {
      this.setSaveStatus(result.reason === 'recovery-slot-occupied' || result.reason === 'recovery-protection-failed' ? 'recovery-required' : 'unavailable');
      if (result.recovery) this.setRecoveryState(recoverySnapshot(result.recovery, this.storage));
      return { ok: false, reason: result.reason };
    }
    clearReadingUiState();
    this.state = state;
    this.subscribers.forEach((listener) => listener());
    this.setRecoveryState(noSaveRecovery);
    this.setSaveStatus('saved');
    this.bus.emit('progress:reset', { schemaVersion: 13 });
    this.bus.emit('save:completed', { schemaVersion: 13 });
    return { ok: true };
  }

  importSave(serialized: string, options: SaveRecoveryWriteOptions = {}): SaveImportResult {
    const result = importSaveText(serialized, this.storage, { ...options, preserveOriginalText: this.exportOriginalSave() ?? undefined });
    if (!result.ok) {
      if (result.reason === 'recovery-slot-occupied' || result.reason === 'recovery-protection-failed') {
        this.setRecoveryState(recoverySnapshot(readSave(this.storage), this.storage));
        this.setSaveStatus('recovery-required');
      } else if (result.reason === 'storage-unavailable' || result.reason === 'backup-unavailable') this.setSaveStatus('unavailable');
      return result;
    }
    this.cancelPendingSave();
    clearReadingUiState();
    this.state = result.state;
    this.subscribers.forEach((listener) => listener());
    this.setRecoveryState(noSaveRecovery);
    this.setSaveStatus('saved');
    this.bus.emit('save:completed', { schemaVersion: 13 });
    this.bus.emit('save:imported', { schemaVersion: 13 });
    return result;
  }

  startJourney(sceneId: string): void {
    this.applyDomainTransition(startJourneyDomain(this.state, sceneId));
  }

  enterScene(sceneId: string): void {
    this.applyDomainTransition(enterSceneDomain(this.state, sceneId));
  }

  inspectSceneHotspot(hotspotId: string): void {
    this.applyDomainTransition(inspectSceneHotspotDomain(this.state, hotspotId));
  }

  captureScenePhoto(sceneId: string, photoId: string): void {
    this.applyDomainTransition(captureScenePhotoDomain(this.state, sceneId, photoId));
  }

  finishJourney(lastSceneId: string): void {
    this.applyDomainTransition(finishJourneyDomain(this.state, lastSceneId));
  }

  openPhotoEditor(photoId: string): void {
    this.applyDomainTransition(openPhotoEditorDomain(this.state, photoId));
  }

  setPhotoAdjustment(photoId: string, adjustment: 'exposure' | 'shadows' | 'contrast', value: number): void {
    this.applyDomainTransition(setPhotoAdjustmentDomain(this.state, photoId, adjustment, value));
  }

  inspectPhotoSymbol(photoId: string): void {
    this.applyDomainTransition(inspectPhotoSymbolDomain(this.state, photoId));
  }

  setPhotoZoom(photoId: string, zoom: number): void {
    this.applyDomainTransition(setPhotoZoomDomain(this.state, photoId, zoom));
  }

  finishFirstAct(): void {
    this.applyDomainTransition(finishFirstActDomain(this.state));
  }

  /** Repairs only the derived bridge Flag/note facts from a valid legacy save. */
  reconcileAct2BridgeProgress(): void {
    this.applyDomainPlan(reconcileAct2BridgeProgressDomain(this.state));
  }

  /** 只有第一幕完成且第二幕尚未启动时生效；保留全部第一幕状态。 */
  startSecondAct(): void {
    this.applyDomainTransition(startSecondActDomain(this.state));
  }

  /** 阶段只允许沿主线前进；桥头调查需要至少做过一次相关的 T01 搜索。 */
  setAct2Stage(stage: Act2ActiveStage): void {
    this.applyDomainTransition(setAct2StageDomain(this.state, stage));
  }

  talkToAct2Elder(elderId: string): void {
    this.applyDomainTransition(talkToAct2ElderDomain(this.state, elderId));
  }

  /** 只接受契约冻结的三张第一幕证据图；出示证据后线索老人会说出“黑捕木”。 */
  showAct2Evidence(assetId: string): void {
    this.applyDomainTransition(showAct2EvidenceDomain(this.state, assetId));
  }

  setHeibumuNameChoice(part: HeibumuNamePart, value: string): void {
    this.applyDomainTransition(setHeibumuNameChoiceDomain(this.state, part, value));
  }

  confirmHeibumuName(): void {
    this.applyDomainPlan(confirmHeibumuNameDomain(this.state));
  }

  visitGazetteSection(sectionId: string): void {
    this.applyDomainTransition(visitGazetteSectionDomain(this.state, sectionId));
  }

  /** 契约要求先收窄目录再打开卷册。 */
  openGazetteVolume(volumeId: string): void {
    this.applyDomainTransition(openGazetteVolumeDomain(this.state, volumeId));
  }

  openGazettePage(pageId: string): void {
    this.applyDomainTransition(openGazettePageDomain(this.state, pageId));
  }

  /** 读到目标页即记录来源和表层记载；关键词标注仍是可选回看工具。 */
  readAct2GazetteTargetPage(): void {
    this.applyDomainPlan(readAct2GazetteTargetPageDomain(this.state));
  }

  /** 只能给正在阅读的页面加书签或取消书签。 */
  toggleGazetteBookmark(pageId: string): void {
    this.applyDomainTransition(toggleGazetteBookmarkDomain(this.state, pageId));
  }

  markGazetteKeyword(keywordId: string): void {
    this.applyDomainTransition(markGazetteKeywordDomain(this.state, keywordId));
  }

  excerptGazetteEntry(entryId: string): void {
    this.applyDomainTransition(excerptGazetteEntryDomain(this.state, entryId));
  }

  readAct2Tale(taleId: string): void {
    this.applyDomainPlan(readAct2TaleDomain(this.state, taleId));
  }

  collectAct2Tale(taleId: string): void {
    this.applyDomainPlan(collectAct2TaleDomain(this.state, taleId));
  }

  /** 阅读志异后主动摘取一条证据；来源笔记随首次摘录自动登记。 */
  toggleAct2TaleEvidence(evidenceId: string): void {
    this.applyDomainPlan(toggleAct2TaleEvidenceDomain(this.state, evidenceId));
  }

  selectAct2TaleInference(inferenceId: 'accompanied-change' | 'recovery-or-imitation' | 'complete-transfer'): void {
    this.applyDomainTransition(selectAct2TaleInferenceDomain(this.state, inferenceId));
  }

  /** T04 暂定判断只接受跨至少两篇来源的证据，不将推测写成机制定论。 */
  inferAct2TransferPattern(inferenceId: 'accompanied-change' | 'recovery-or-imitation' | 'complete-transfer'): 'blocked' | 'insufficient' | 'overclaim' | 'accepted' {
    return this.applyDomainPlan(inferAct2TransferPatternDomain(this.state, inferenceId));
  }

  placeAct2TaleCard(cardId: string): void {
    this.applyDomainTransition(placeAct2TaleCardDomain(this.state, cardId));
  }

  finishAct2TaleSorting(): void {
    this.applyDomainPlan(finishAct2TaleSortingDomain(this.state));
  }

  acknowledgeAct2TransferInference(): void {
    this.applyDomainPlan(acknowledgeAct2TransferInferenceDomain(this.state));
  }

  /** 只能由小月的新微信内容主动触发；重载不会越级进入。 */
  enterAct2School(): void {
    this.applyDomainTransition(enterAct2SchoolDomain(this.state));
  }

  /** 只有 T05 双 S 已确认且玩家进行了有效启明搜索时才能进入 T06。 */
  enterAct2QimingResearch(): void {
    this.applyDomainTransition(enterAct2QimingResearchDomain(this.state));
  }

  inferAct2QimingNameMatch(person: 'huang' | 'zhong'): void {
    this.applyDomainPlan(inferAct2QimingNameMatchDomain(this.state, person));
  }

  /** Optional nickname reading. It records uncertainty only and never gates the main route. */
  recordAct2QimingNicknameAssessment(assessment: Act2QimingNicknameAssessment): boolean {
    return this.applyDomainPlan(recordAct2QimingNicknameAssessmentDomain(this.state, assessment));
  }

  /** Records one实名个案 in a single persistent action after both cited pages were opened. */
  reviewAct2QimingCase(caseId: Act2QimingCaseId, sourcePageIds: string[], conclusionId: Act2QimingConclusionId): Act2QimingCaseReviewResult {
    return this.applyDomainPlan(reviewAct2QimingCaseDomain(this.state, caseId, sourcePageIds, conclusionId));
  }

  confirmAct2OtherCasesAbnormal(): void {
  }

  visitAct2SchoolArea(areaId: string): void {
    this.applyDomainPlan(visitAct2SchoolAreaDomain(this.state, areaId));
  }

  inspectAct2SchoolHotspot(hotspotId: string): void {
    this.applyDomainTransition(inspectAct2SchoolHotspotDomain(this.state, hotspotId));
  }

  acknowledgeAct2TeacherAccount(): void {
    this.applyDomainPlan(acknowledgeAct2TeacherAccountDomain(this.state));
  }

  readAct2SchoolRanks(): void {
    this.applyDomainPlan(readAct2SchoolRanksDomain(this.state));
  }

  readAct2QimingTestimonial(): void {
    this.applyDomainPlan(readAct2QimingTestimonialDomain(this.state));
  }

  inspectAct2SchoolNotebook(): void {
    this.applyDomainTransition(inspectAct2SchoolNotebookDomain(this.state));
  }

  confirmAct2SchoolSymbolMatch(): void {
    this.applyDomainTransition(confirmAct2SchoolSymbolMatchDomain(this.state));
  }

  toggleAct2SchoolEvidence(evidenceId: Act2SchoolEvidenceId): void {
    this.applyDomainTransition(toggleAct2SchoolEvidenceDomain(this.state, evidenceId));
  }

  selectAct2SchoolInference(inferenceId: Act2SchoolInferenceId): void {
    this.applyDomainTransition(selectAct2SchoolInferenceDomain(this.state, inferenceId));
  }

  confirmAct2SchoolTimeline(): void {
    this.applyDomainPlan(confirmAct2SchoolTimelineDomain(this.state));
  }

  // ─── 第三幕 T00–T02 接口 ───────────────────────────────────────────

  /** 第三幕在第二幕 T07 完整收束后，由玩家主动进入。 */
  static readonly ACT3_ENTRY_FLAG = 'FLAG_A2_COMPLETE';
  static readonly ACT3_GATE_FLAG_T00 = 'FLAG_A3_GATE_REACHED';
  static readonly ACT3_GATE_FLAG_T01 = 'FLAG_A3_INNER_FENCE_PASSED';
  static readonly ACT3_GATE_FLAG_T02 = 'FLAG_A3_CLASSROOM_TURNED';
  static readonly ACT3_COMPLETE_FLAG_T00 = 'FLAG_A3_OLD_ROAD_FOUND';
  static readonly ACT3_COMPLETE_FLAG_T01 = 'FLAG_A3_QIMING_SITE_CONFIRMED';
  static readonly ACT3_COMPLETE_FLAG_T02 = 'FLAG_A3_CLASSROOM_CONTRADICTION_NOTED';
  static readonly ACT3_COMPLETE_FLAG_T03 = 'FLAG_A3_CONFINEMENT_SITE_CONFIRMED';
  static readonly ACT3_COMPLETE_FLAG_T04 = 'FLAG_A3_VVAKE_PAPER_FOUND';
  static readonly ACT3_COMPLETE_FLAG_T05 = 'FLAG_A3_13ACK_PAPER_FOUND';
  static readonly ACT3_COMPLETE_FLAG_T06 = 'FLAG_A3_HEIBUMU_QIMING_LINK_CONFIRMED';
  static readonly ACT3_COMPLETE_FLAG_T07 = 'FLAG_A3_COMPLETE';

  /** 启动第三幕；只在第二幕 T07 完成、第三幕尚未启动时生效。 */
  startAct3(): void {
    this.applyDomainTransition(startAct3Domain(this.state));
  }

  /** 切换当前镜头；不允许跨 T。 */
  enterAct3Lens(lensId: string): boolean {
    return this.applyDomainTransition(enterAct3LensDomain(this.state, lensId));
  }

  /** 检视线索；镜头与线索必须属于当前 T。 */
  inspectAct3Clue(clueId: string): void {
    this.applyDomainPlan(inspectAct3ClueDomain(this.state, clueId));
  }

  /** 玩家确认当前阶段结论；只记录判断，不切换地点或阶段。 */
  confirmAct3Stage(): void {
    this.applyDomainPlan(confirmAct3StageDomain(this.state));
  }

  /** 只有 T06 收束且玩家主动点击入口才进入 T07；重复点击无副作用。 */
  enterAct2FinaleInvestigation(): void {
    this.applyDomainTransition(enterAct2FinaleInvestigationDomain(this.state));
  }

  /** 只接受冻结的资料 ID；打开受访视频后写入 FOUND。 */
  viewAct2T07Material(materialId: string): void {
    this.applyDomainPlan(viewAct2T07MaterialDomain(this.state, materialId));
  }

  /** 只在真实播放推进时调用；拖动进度条不算覆盖。 */
  markAct2T07SegmentPlayed(segmentId: string): void {
    this.applyDomainPlan(markAct2T07SegmentPlayedDomain(this.state, segmentId));
  }

  /** 截图必须落在登记的关键帧窗口内；不接受伪造帧 ID 或窗口外的时间。 */
  captureAct2T07Frame(frameId: string, timeMs: number): void {
    this.applyDomainTransition(captureAct2T07FrameDomain(this.state, frameId, timeMs));
  }

  /** 只能核对已经截到的帧；比对结果持久化，缩放与开合只是瞬时状态。 */
  compareAct2T07TempleFrame(frameId: string, featureId: string): boolean {
    return this.applyDomainTransition(compareAct2T07TempleFrameDomain(this.state, frameId, featureId));
  }

  /** Compare and record the matching exterior evidence atomically. */
  submitAct2T07Comparison(frameId: string, featureId: string): 'recorded' | 'already-recorded' | 'invalid-frame' | 'invalid-feature' | 'insufficient-evidence' | 'wrong-stage' {
    return this.applyDomainTransition(submitAct2T07ComparisonDomain(this.state, frameId, featureId));
  }

  confirmAct2T07TempleFrame(): void {
    this.applyDomainPlan(confirmAct2T07TempleFrameDomain(this.state));
  }

  /** 双 S 只来自合影右下角的主动检查与确认。 */
  confirmAct2T07PhotoSymbol(): void {
    this.applyDomainPlan(confirmAct2T07PhotoSymbolDomain(this.state));
  }

  /** 地点判断需要主动核对合影双 S 与视频截图中的石质轮廓；完整播放保留为可选行为。 */
  inferAct2T07Location(): void {
    this.applyDomainPlan(inferAct2T07LocationDomain(this.state));
  }

  planAct2T07SecondTrip(): void {
    this.applyDomainPlan(planAct2T07SecondTripDomain(this.state));
  }

  /** 幕末收束只在行程确认后写入一次；之后可回看资料但不自动进入第三幕。 */
  completeAct2T07Finale(): void {
    this.applyDomainPlan(completeAct2T07FinaleDomain(this.state));
  }

  /** 新阶段上线后，已确认上一阶段的旧存档仍可由玩家主动继续。 */
  advanceAct3Stage(): void {
    this.applyDomainTransition(advanceAct3StageDomain(this.state));
  }

  /** T07 取出并确认笔记后，玩家主动离开遗址；离开事实只在此时记录。 */
  leaveAct3Stage(): void {
    this.applyDomainTransition(leaveAct3StageDomain(this.state));
  }

  /** 第三幕终点只是入口；玩家在回看笔记时主动开始第四幕。 */
  startAct4(): void {
    this.applyDomainTransition(startAct4Domain(this.state));
  }

  readAct4NotebookPage(page: number): void {
    this.applyDomainTransition(readAct4NotebookPageDomain(this.state, page));
  }

  checkAct4OldMail(recipient: 'protagonist' | 'xiaoyue'): void {
    this.applyDomainTransition(checkAct4OldMailDomain(this.state, recipient));
  }

  viewAct4WakeMail(): void {
    this.applyDomainTransition(completeAct4NarrativeActionDomain(this.state, "A4_T04_WAKE_MAIL_OPENED"));
  }

  /** 答案在控制器中检查；这里只接受语义题目与当前阶段前置。 */
  solveAct4Puzzle(puzzleId: string, selections: string[]): boolean {
    return this.applyDomainTransition(solveAct4PuzzleDomain(this.state, puzzleId, selections));
  }

  loginAct4Accounts(password: string): boolean {
    return this.applyDomainTransition(loginAct4AccountsDomain(this.state, password));
  }

  readAct4Timeline(date: string): void {
    this.applyDomainTransition(readAct4TimelineDomain(this.state, date));
  }

  confirmAct4BroadcastPeriod(period: 'morning' | 'night', groupId: string): boolean {
    return this.applyDomainTransition(confirmAct4BroadcastPeriodDomain(this.state, period, groupId));
  }

  visitAct4BirthdayNode(nodeId: string): void {
    this.applyDomainTransition(visitAct4BirthdayNodeDomain(this.state, nodeId));
  }

  advanceAct4Stage(expectedStage: Exclude<Act4Stage, 'inactive'>): void {
    this.applyDomainTransition(advanceAct4NarrativeSectionDomain(this.state, expectedStage));
  }

  /** T05 停在家门；玩家再次主动选择才进入机构回忆。 */
  startAct4T06(): void {
    this.applyDomainTransition(advanceAct4NarrativeSectionDomain(this.state, "T05"));
  }

  visitAct4LaterNode(id: string): void {
    this.applyDomainTransition(visitAct4LaterNodeDomain(this.state, id));
  }

  advanceAct4Package(action: 'bag' | 'tape' | 'hide'): void {
    this.applyDomainTransition(advanceAct4PackageDomain(this.state, action));
  }

  advanceAct4Broadcast(): void {
    this.applyDomainTransition(advanceAct4BroadcastDomain(this.state));
  }

  openAct4FinalMail(): void {
    this.applyDomainTransition(completeAct4NarrativeActionDomain(this.state, "A4_T10_FINAL_MAIL_OPENED"));
  }

  openAct4Archive(): boolean {
    return this.applyDomainTransition(completeAct4NarrativeActionDomain(this.state, "A4_T08_ARCHIVE_OPENED"));
  }

  hideAct4NarrativeNote(): boolean {
    return this.applyDomainTransition(completeAct4NarrativeActionDomain(this.state, "A4_T09_NOTE_HIDDEN"));
  }

  exitAct4NarrativeDoor(): boolean {
    return this.applyDomainTransition(completeAct4NarrativeActionDomain(this.state, "A4_T09_DOOR_EXITED"));
  }

  advanceAct4NarrativeSection(expectedStage: Exclude<Act4Stage, 'inactive'>): void {
    this.applyDomainTransition(advanceAct4NarrativeSectionDomain(this.state, expectedStage));
  }

  advanceAct4LaterStage(expectedStage: Exclude<Act4Stage, 'inactive'>): void {
    this.applyDomainTransition(advanceAct4NarrativeSectionDomain(this.state, expectedStage));
  }
}

export const stateManager = new StateManager();
