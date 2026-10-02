import { describe, expect, it } from 'vitest';
import {
  ACT2_LIBRARY_SHELF_IMAGE_SIZE,
  ACT2_SHELF_ROW_RECTS,
  normalizedRectToPercentStyle,
  projectNormalizedImageRect,
  validateNormalizedImageRect,
} from './act2Presentation';

describe('Act 2 shelf presentation geometry', () => {
  it('keeps each selectable row inside the complete shelf photo', () => {
    ACT2_SHELF_ROW_RECTS.forEach(validateNormalizedImageRect);
    expect(ACT2_LIBRARY_SHELF_IMAGE_SIZE.width / ACT2_LIBRARY_SHELF_IMAGE_SIZE.height).toBe(4 / 3);
  });

  it('projects one image-space hotspot proportionally across wide and narrow image planes', () => {
    const rect = ACT2_SHELF_ROW_RECTS[1];
    const wide = projectNormalizedImageRect(rect, { width: 1200, height: 900 });
    const narrow = projectNormalizedImageRect(rect, { width: 360, height: 270 });

    expect(wide.left).toBeCloseTo(57.6);
    expect(wide.top).toBeCloseTo(343.8);
    expect(wide.width).toBeCloseTo(468);
    expect(wide.height).toBeCloseTo(202.5);
    expect(narrow.left).toBeCloseTo(17.28);
    expect(narrow.top).toBeCloseTo(103.14);
    expect(narrow.width).toBeCloseTo(140.4);
    expect(narrow.height).toBeCloseTo(60.75);
    expect(wide.left / 1200).toBeCloseTo(narrow.left / 360);
    expect(wide.top / 900).toBeCloseTo(narrow.top / 270);
    expect(wide.width / 1200).toBeCloseTo(narrow.width / 360);
    expect(wide.height / 900).toBeCloseTo(narrow.height / 270);
  });

  it('emits percentage styles relative to the full image plane and rejects out-of-image regions', () => {
    expect(normalizedRectToPercentStyle(ACT2_SHELF_ROW_RECTS[0])).toEqual({ left: '5.8%', top: '16%', width: '37.5%', height: '21.5%' });
    expect(() => validateNormalizedImageRect({ x: 0.9, y: 0, width: 0.2, height: 0.1 })).toThrow(/within the normalized image plane/);
    expect(() => projectNormalizedImageRect(ACT2_SHELF_ROW_RECTS[0], { width: 0, height: 270 })).toThrow(/positive finite/);
  });
});
