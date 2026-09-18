import { APP_IDS, type AppId, type AppState, type Bounds, type DesktopWindow, type WindowStatus } from './types';
import { createDefaultState, createDefaultWindow } from './defaultState';
import { sceneById } from '../data/sceneData';

export const SAVE_KEY = 'anchao.save.v1';
const validStatuses: WindowStatus[] = ['closed', 'normal', 'minimized', 'maximized'];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const finiteNumber = (value: unknown, fallback: number): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const safeStringIds = (value: unknown): string[] => Array.isArray(value)
  ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))]
  : [];
const safeBounds = (candidate: unknown, fallback: Bounds): Bounds => {
  if (!isRecord(candidate)) return { ...fallback };
  return {
    x: finiteNumber(candidate.x, fallback.x),
    y: finiteNumber(candidate.y, fallback.y),
    width: Math.max(320, finiteNumber(candidate.width, fallback.width)),
    height: Math.max(240, finiteNumber(candidate.height, fallback.height)),
  };
};

const safeWindow = (appId: AppId, candidate: unknown, index: number): DesktopWindow => {
  const fallback = createDefaultWindow(appId, index + 1);
  if (!isRecord(candidate)) return fallback;
  const restoreBounds = candidate.restoreBounds === null ? null : safeBounds(candidate.restoreBounds, fallback.bounds);
  return {
    appId,
    status: validStatuses.includes(candidate.status as WindowStatus) ? candidate.status as WindowStatus : fallback.status,
    bounds: safeBounds(candidate.bounds, fallback.bounds),
    restoreBounds,
    zIndex: Math.max(1, finiteNumber(candidate.zIndex, fallback.zIndex)),
  };
};

export const hydrateState = (candidate: unknown): AppState => {
  const fallback = createDefaultState();
  if (!isRecord(candidate) || candidate.schemaVersion !== 1) return fallback;
  const game = isRecord(candidate.game) ? candidate.game : {};
  const desktop = isRecord(candidate.desktop) ? candidate.desktop : {};
  const settings = isRecord(candidate.settings) ? candidate.settings : {};
  const modules = isRecord(candidate.modules) ? candidate.modules : {};
  const mail = isRecord(modules.mail) ? modules.mail : null;
  const browser = isRecord(modules.browser) ? modules.browser : null;
  const notepad = isRecord(modules.notepad) ? modules.notepad : null;
  const scene = isRecord(modules.scene) ? modules.scene : null;
  const photos = isRecord(modules.photos) ? modules.photos : null;
  const rawWindows = isRecord(desktop.windows) ? desktop.windows : {};
  const windows = Object.fromEntries(APP_IDS.map((appId, index) => [appId, safeWindow(appId, rawWindows[appId], index)])) as AppState['desktop']['windows'];
  const activeAppId = APP_IDS.includes(desktop.activeAppId as AppId) ? desktop.activeAppId as AppId : null;
  const openedOnceAppIds = Array.isArray(desktop.openedOnceAppIds)
    ? desktop.openedOnceAppIds.filter((appId): appId is AppId => APP_IDS.includes(appId as AppId))
    : [];
  const requestedSceneId = scene && typeof scene.currentSceneId === 'string' ? scene.currentSceneId : null;
  const sceneIsValid = requestedSceneId !== null && sceneById.has(requestedSceneId);
  const journeyStarted = scene?.journeyStarted === true && sceneIsValid;
  return {
    schemaVersion: 1,
    game: {
      act: finiteNumber(game.act, fallback.game.act),
      phase: typeof game.phase === 'string' ? game.phase : fallback.game.phase,
      flags: isRecord(game.flags)
        ? Object.fromEntries(Object.entries(game.flags).filter(([, value]) => ['boolean', 'string', 'number'].includes(typeof value))) as AppState['game']['flags']
        : {},
      discoveredClueIds: Array.isArray(game.discoveredClueIds) ? game.discoveredClueIds.filter((id): id is string => typeof id === 'string') : [],
    },
    desktop: { windows, activeAppId, openedOnceAppIds },
    settings: { reducedMotion: settings.reducedMotion === true },
    modules: {
      mail: {
        readIds: mail ? safeStringIds(mail.readIds) : [...fallback.modules.mail.readIds],
        starredIds: mail ? safeStringIds(mail.starredIds) : [...fallback.modules.mail.starredIds],
      },
      browser: {
        queryHistory: browser ? safeStringIds(browser.queryHistory).slice(0, 20) : [],
        visitedPageIds: browser ? safeStringIds(browser.visitedPageIds) : [],
      },
      notepad: {
        userText: notepad && typeof notepad.userText === 'string' ? notepad.userText : '',
        autoEntryIds: notepad ? safeStringIds(notepad.autoEntryIds) : [],
      },
      scene: {
        journeyStarted,
        currentSceneId: journeyStarted ? requestedSceneId : null,
        visitedSceneIds: scene ? safeStringIds(scene.visitedSceneIds).filter((id) => sceneById.has(id)) : [],
        inspectedHotspotIds: scene ? safeStringIds(scene.inspectedHotspotIds) : [],
        capturedPhotoIds: scene ? safeStringIds(scene.capturedPhotoIds) : [],
      },
      photos: {
        activePhotoId: photos && typeof photos.activePhotoId === 'string' ? photos.activePhotoId : null,
        openedPhotoIds: photos ? safeStringIds(photos.openedPhotoIds) : [],
        adjustments: photos && isRecord(photos.adjustments)
          ? Object.fromEntries(Object.entries(photos.adjustments).filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1])).map(([id, value]) => [id, {
            exposure: finiteNumber(value.exposure, 0), shadows: finiteNumber(value.shadows, 0), contrast: finiteNumber(value.contrast, 0),
          }]))
          : {},
        zoomByPhotoId: photos && isRecord(photos.zoomByPhotoId)
          ? Object.fromEntries(Object.entries(photos.zoomByPhotoId).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1])).map(([id, value]) => [id, Math.max(1, Math.min(2.5, value))]))
          : {},
        inspectedSymbolPhotoIds: photos ? safeStringIds(photos.inspectedSymbolPhotoIds) : [],
      },
    },
  };
};

export const loadState = (storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage): AppState => {
  if (!storage) return createDefaultState();
  try {
    const saved = storage.getItem(SAVE_KEY);
    return saved ? hydrateState(JSON.parse(saved)) : createDefaultState();
  } catch {
    return createDefaultState();
  }
};

export const saveState = (state: AppState, storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage): boolean => {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
};
