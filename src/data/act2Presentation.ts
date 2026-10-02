/** Screen-only presentation metadata. These rectangles are fractions of the complete 4:3 shelf photo. */
export interface NormalizedImageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProjectedImageRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const ACT2_LIBRARY_SHELF_IMAGE_SIZE = { width: 1448, height: 1086 } as const;

// Each rectangle sits on one row of books on the left shelving in IMG_A2_T03_001.
// Keep these in visual order; callers pair the rows with their existing records.
export const ACT2_SHELF_ROW_RECTS: readonly NormalizedImageRect[] = [
  { x: 0.058, y: 0.16, width: 0.375, height: 0.215 },
  { x: 0.048, y: 0.382, width: 0.39, height: 0.225 },
  { x: 0.068, y: 0.635, width: 0.36, height: 0.235 },
];

/** Translate normalized image coordinates to CSS percentages for an overlay on the full image plane. */
export function normalizedRectToPercentStyle(rect: NormalizedImageRect): {
  left: string;
  top: string;
  width: string;
  height: string;
} {
  validateNormalizedImageRect(rect);
  const percent = (value: number) => `${Number((value * 100).toFixed(6))}%`;
  return {
    left: percent(rect.x),
    top: percent(rect.y),
    width: percent(rect.width),
    height: percent(rect.height),
  };
}

/** Project the same image-space rectangle into a rendered photo plane of any size. */
export function projectNormalizedImageRect(
  rect: NormalizedImageRect,
  plane: { width: number; height: number },
): ProjectedImageRect {
  validateNormalizedImageRect(rect);
  if (!Number.isFinite(plane.width) || !Number.isFinite(plane.height) || plane.width <= 0 || plane.height <= 0) {
    throw new Error('Image plane dimensions must be positive finite numbers.');
  }
  return {
    left: rect.x * plane.width,
    top: rect.y * plane.height,
    width: rect.width * plane.width,
    height: rect.height * plane.height,
  };
}

export function validateNormalizedImageRect(rect: NormalizedImageRect): void {
  const values = [rect.x, rect.y, rect.width, rect.height];
  if (values.some((value) => !Number.isFinite(value)) || rect.x < 0 || rect.y < 0 || rect.width <= 0 || rect.height <= 0 || rect.x + rect.width > 1 || rect.y + rect.height > 1) {
    throw new Error('Shelf hotspot must remain within the normalized image plane.');
  }
}
