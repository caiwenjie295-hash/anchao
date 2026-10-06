import { createDefaultState } from '../defaultState';
import type { AppId, AppState, Bounds } from '../types';
import { domainChange, noDomainChange, type DomainTransition } from './transitions';

function nextZIndex(state: AppState): number {
  return Math.max(...Object.values(state.desktop.windows).map((window) => window.zIndex), 0) + 1;
}

function nextVisibleAppId(windows: AppState['desktop']['windows']): AppId | null {
  return Object.values(windows)
    .filter((window) => window.status === 'normal' || window.status === 'maximized')
    .sort((left, right) => right.zIndex - left.zIndex)[0]?.appId ?? null;
}

export function openApp(state: AppState, appId: AppId): DomainTransition {
  const current = state.desktop.windows[appId];
  if (current.status !== 'closed') return focusWindow(state, appId);
  const openedOnceAppIds = state.desktop.openedOnceAppIds.includes(appId)
    ? state.desktop.openedOnceAppIds
    : [...state.desktop.openedOnceAppIds, appId];
  const windows = { ...state.desktop.windows, [appId]: { ...current, status: 'normal' as const, zIndex: nextZIndex(state) } };
  return domainChange(state, { ...state, desktop: { ...state.desktop, windows, activeAppId: appId, openedOnceAppIds } }, [
    { type: 'app:opened', payload: { appId } },
    { type: 'window:focused', payload: { appId } },
  ]);
}

export function focusWindow(state: AppState, appId: AppId): DomainTransition {
  const current = state.desktop.windows[appId];
  if (current.status === 'closed') return openApp(state, appId);
  if (current.status === 'minimized') {
    const status = current.restoreBounds === null ? 'normal' as const : 'maximized' as const;
    const windows = { ...state.desktop.windows, [appId]: { ...current, status, zIndex: nextZIndex(state) } };
    return domainChange(state, { ...state, desktop: { ...state.desktop, windows, activeAppId: appId } }, [
      { type: 'window:focused', payload: { appId } },
    ]);
  }
  const windows = { ...state.desktop.windows, [appId]: { ...current, zIndex: nextZIndex(state) } };
  return domainChange(state, { ...state, desktop: { ...state.desktop, windows, activeAppId: appId } }, [
    { type: 'window:focused', payload: { appId } },
  ]);
}

export function closeWindow(state: AppState, appId: AppId): DomainTransition {
  const windows = { ...state.desktop.windows, [appId]: { ...state.desktop.windows[appId], status: 'closed' as const } };
  const activeAppId = state.desktop.activeAppId === appId ? nextVisibleAppId(windows) : state.desktop.activeAppId;
  return domainChange(state, { ...state, desktop: { ...state.desktop, windows, activeAppId } }, [
    { type: 'app:closed', payload: { appId } },
  ]);
}

export function minimizeWindow(state: AppState, appId: AppId): DomainTransition {
  const current = state.desktop.windows[appId];
  if (current.status === 'closed') return noDomainChange(state);
  const windows = { ...state.desktop.windows, [appId]: { ...current, status: 'minimized' as const } };
  const activeAppId = state.desktop.activeAppId === appId ? nextVisibleAppId(windows) : state.desktop.activeAppId;
  return domainChange(state, { ...state, desktop: { ...state.desktop, windows, activeAppId } });
}

export function toggleTaskbarApp(state: AppState, appId: AppId): DomainTransition {
  const current = state.desktop.windows[appId];
  return state.desktop.activeAppId === appId && (current.status === 'normal' || current.status === 'maximized')
    ? minimizeWindow(state, appId)
    : focusWindow(state, appId);
}

export function toggleMaximize(state: AppState, appId: AppId, viewport: Bounds): DomainTransition {
  const current = state.desktop.windows[appId];
  const windows = { ...state.desktop.windows };
  if (current.status === 'maximized') {
    const restored = current.restoreBounds ?? createDefaultState().desktop.windows[appId].bounds;
    windows[appId] = { ...current, status: 'normal', bounds: { ...restored }, restoreBounds: null, zIndex: nextZIndex(state) };
  } else {
    windows[appId] = { ...current, status: 'maximized', restoreBounds: { ...current.bounds }, bounds: { ...viewport }, zIndex: nextZIndex(state) };
  }
  return domainChange(state, { ...state, desktop: { ...state.desktop, windows, activeAppId: appId } });
}

export function setBounds(state: AppState, appId: AppId, bounds: Bounds): DomainTransition {
  const current = state.desktop.windows[appId];
  if (current.status === 'maximized') return noDomainChange(state);
  const nextBounds = { x: Math.max(0, bounds.x), y: Math.max(0, bounds.y), width: Math.max(320, bounds.width), height: Math.max(240, bounds.height) };
  if (current.bounds.x === nextBounds.x && current.bounds.y === nextBounds.y && current.bounds.width === nextBounds.width && current.bounds.height === nextBounds.height) return noDomainChange(state);
  return domainChange(state, {
    ...state,
    desktop: { ...state.desktop, windows: { ...state.desktop.windows, [appId]: { ...current, bounds: nextBounds } } },
  }, [], undefined, 'deferred');
}
