/** Bridge elder targets in the complete 1448 × 1086 photo plane. */
export interface BridgeImageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BridgeElderTarget {
  elderId: string;
  rect: BridgeImageRect;
}

const rectFromPixels = (x: number, y: number, right: number, bottom: number): BridgeImageRect => ({
  x: x / 1448,
  y: y / 1086,
  width: (right - x) / 1448,
  height: (bottom - y) / 1086,
});

/**
 * Bounds were traced from the four visible people in IMG_A2_T02_001.jpg:
 * black coat at left, burgundy coat behind him, checkered coat in front,
 * and the cap-wearing man on the right. The left pair's real silhouettes
 * overlap in the photo; the text choices below the image remain an exact,
 * non-overlapping way to select either person.
 */
export const ACT2_BRIDGE_ELDER_TARGETS: readonly BridgeElderTarget[] = [
  { elderId: 'ELDER_A2_T02_001', rect: rectFromPixels(252, 498, 570, 947) },
  { elderId: 'ELDER_A2_T02_002', rect: rectFromPixels(402, 499, 574, 764) },
  { elderId: 'ELDER_A2_T02_003', rect: rectFromPixels(535, 558, 776, 960) },
  { elderId: 'ELDER_A2_T02_004', rect: rectFromPixels(741, 476, 1008, 860) },
];

export const bridgeRectToPercentStyle = (rect: BridgeImageRect) => {
  const percent = (value: number) => `${Number((value * 100).toFixed(5))}%`;
  return {
    left: percent(rect.x),
    top: percent(rect.y),
    width: percent(rect.width),
    height: percent(rect.height),
  };
};

export function validateBridgeElderTargets(targets: readonly BridgeElderTarget[] = ACT2_BRIDGE_ELDER_TARGETS): void {
  if (targets.length !== 4 || new Set(targets.map(({ elderId }) => elderId)).size !== 4) {
    throw new Error('桥头人物热点必须各自对应四位老人。');
  }
  for (const { elderId, rect } of targets) {
    if (!elderId.startsWith('ELDER_A2_T02_')) throw new Error(`桥头人物热点 ID 无效：${elderId}`);
    const { x, y, width, height } = rect;
    if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 || y + height > 1) {
      throw new Error(`桥头人物热点超出完整图像平面：${elderId}`);
    }
  }
}

validateBridgeElderTargets();
