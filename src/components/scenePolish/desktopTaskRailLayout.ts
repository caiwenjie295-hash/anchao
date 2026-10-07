import type { DesktopWindow } from '../../core/types';

export interface DesktopViewport {
  width: number;
  height: number;
}

const TASK_RAIL_RESERVATION = 376;
const WINDOW_GUTTER = 16;
const TASKBAR_HEIGHT = 64;

/** Keeps desktop windows inside the workspace left open by the always-visible task rail. */
export function fitWindowBesideTaskRail(windowState: DesktopWindow, viewport: DesktopViewport, taskCardExpanded = false): DesktopWindow {
  const narrowLayout = viewport.width < 900;
  const workspaceWidth = narrowLayout ? Math.max(320, viewport.width) : Math.max(320, viewport.width - TASK_RAIL_RESERVATION);
  const workspaceHeight = narrowLayout
    ? Math.max(240, viewport.height - TASKBAR_HEIGHT - (taskCardExpanded ? 244 : 104) - 12)
    : Math.max(240, viewport.height - TASKBAR_HEIGHT);

  if (windowState.status === 'maximized') {
    return {
      ...windowState,
      bounds: { ...windowState.bounds, x: 0, y: 0, width: workspaceWidth, height: workspaceHeight },
    };
  }

  const windowMaxWidth = narrowLayout ? viewport.width : Math.max(320, workspaceWidth - WINDOW_GUTTER * 2);
  const width = Math.min(windowState.bounds.width, windowMaxWidth);
  const height = Math.min(windowState.bounds.height, workspaceHeight);
  const x = Math.max(0, Math.min(windowState.bounds.x, workspaceWidth - width - WINDOW_GUTTER));
  const y = Math.max(0, Math.min(windowState.bounds.y, workspaceHeight - height));
  return { ...windowState, bounds: { ...windowState.bounds, x, y, width, height } };
}
