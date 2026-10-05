import type { Bounds } from '../core/types';

export const DESKTOP_TASKBAR_CLEARANCE = 64;

/** Keep the full title bar and resize area inside the usable desktop viewport. */
export function clampWindowBounds(
  bounds: Bounds,
  viewportWidth: number,
  viewportHeight: number,
  taskbarClearance = DESKTOP_TASKBAR_CLEARANCE,
): Bounds {
  const safeWidth = Math.max(1, viewportWidth);
  const safeHeight = Math.max(1, viewportHeight - taskbarClearance);
  const minWidth = Math.min(320, safeWidth);
  const minHeight = Math.min(240, safeHeight);
  const width = Math.min(safeWidth, Math.max(minWidth, bounds.width));
  const height = Math.min(safeHeight, Math.max(minHeight, bounds.height));
  return {
    x: Math.min(Math.max(0, bounds.x), Math.max(0, safeWidth - width)),
    y: Math.min(Math.max(0, bounds.y), Math.max(0, safeHeight - height)),
    width,
    height,
  };
}

export function sameWindowBounds(left: Bounds, right: Bounds): boolean {
  return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height;
}
