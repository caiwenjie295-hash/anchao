import { describe, expect, it } from 'vitest';
import { clampWindowBounds } from './windowGeometry';

describe('clampWindowBounds', () => {
  it('keeps the title bar and resize corner inside the desktop area', () => {
    expect(clampWindowBounds({ x: 900, y: 700, width: 720, height: 600 }, 1024, 768)).toEqual({
      x: 304, y: 104, width: 720, height: 600,
    });
  });

  it('shrinks windows to narrow viewports while keeping usable minimums when possible', () => {
    expect(clampWindowBounds({ x: -20, y: 700, width: 900, height: 500 }, 390, 844)).toEqual({
      x: 0, y: 280, width: 390, height: 500,
    });
    expect(clampWindowBounds({ x: 0, y: 0, width: 400, height: 300 }, 280, 220)).toEqual({
      x: 0, y: 0, width: 280, height: 156,
    });
  });
});
