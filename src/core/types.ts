export const APP_IDS = ['wechat', 'mail', 'browser', 'explorer', 'notepad', 'photos'] as const;

export type AppId = (typeof APP_IDS)[number];
export type WindowStatus = 'closed' | 'normal' | 'minimized' | 'maximized';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DesktopWindow {
  appId: AppId;
  status: WindowStatus;
  bounds: Bounds;
  restoreBounds: Bounds | null;
  zIndex: number;
}

export interface GameState {
  act: number;
  phase: string;
  flags: Record<string, boolean | string | number>;
  discoveredClueIds: string[];
}

export type GamePhase = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K';

export interface DesktopState {
  windows: Record<AppId, DesktopWindow>;
  activeAppId: AppId | null;
  openedOnceAppIds: AppId[];
}

export interface SettingsState {
  reducedMotion: boolean;
}

export interface MailState {
  readIds: string[];
  starredIds: string[];
}

export interface BrowserState {
  queryHistory: string[];
  visitedPageIds: string[];
}

export interface NotepadState {
  userText: string;
  autoEntryIds: string[];
}

export interface SceneState {
  journeyStarted: boolean;
  currentSceneId: string | null;
  visitedSceneIds: string[];
  inspectedHotspotIds: string[];
  capturedPhotoIds: string[];
}

export interface PhotosState {
  activePhotoId: string | null;
  openedPhotoIds: string[];
  adjustments: Record<string, { exposure: number; shadows: number; contrast: number }>;
  zoomByPhotoId: Record<string, number>;
  inspectedSymbolPhotoIds: string[];
}

export interface AppState {
  schemaVersion: 1;
  game: GameState;
  desktop: DesktopState;
  settings: SettingsState;
  modules: {
    mail: MailState;
    browser: BrowserState;
    notepad: NotepadState;
    scene: SceneState;
    photos: PhotosState;
  };
}

export type AnchaoEventMap = {
  'app:opened': { appId: AppId };
  'app:closed': { appId: AppId };
  'window:focused': { appId: AppId };
  'flag:changed': { flagId: string; value: boolean | string | number };
  'phase:changed': { phase: GamePhase };
  'chat:opened': { contactId: string };
  'mail:opened': { mailId: string };
  'browser:searched': { query: string };
  'browser:page-opened': { pageId: string };
  'notepad:auto-entry-added': { entryId: string };
  'journey:started': { sceneId: string };
  'scene:entered': { sceneId: string };
  'scene:hotspot-inspected': { hotspotId: string };
  'scene:photo-captured': { sceneId: string; photoId: string };
  'journey:finished': { lastSceneId: string };
  'photo:editor-opened': { photoId: string };
  'photo:adjusted': { photoId: string };
  'photo:symbol-inspected': { photoId: string };
  'progress:reset': { schemaVersion: 1 };
  'save:completed': { schemaVersion: 1 };
};
