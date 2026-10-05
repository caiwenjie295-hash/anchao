import type { Act4ReadingPosition, Act4ReadingSpaceMode } from './uiPreferences';

export interface ReaderBlockBounds {
  blockId: string;
  pageCount: number;
  coverKeys: readonly string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function act4ReadingSpaceKey(stage: string, mode: Act4ReadingSpaceMode): string | null {
  return /^T(?:0[1-9]|10)$/.test(stage) ? `${stage}:${mode}` : null;
}

/** Drops hidden/unknown blocks and clamps page indexes to the currently available text. */
export function sanitizeAct4ReadingPosition(candidate: unknown, blocks: readonly ReaderBlockBounds[]): Act4ReadingPosition {
  const source = isRecord(candidate) ? candidate : {};
  const allowedBlocks = new Map(blocks.filter((block) => block.blockId && block.pageCount > 0).map((block) => [block.blockId, block]));
  const rawPages = isRecord(source.pageIndexByBlock) ? source.pageIndexByBlock : {};
  const pageIndexByBlock: Record<string, number> = {};
  for (const [blockId, rawPageIndex] of Object.entries(rawPages)) {
    const block = allowedBlocks.get(blockId);
    if (!block || typeof rawPageIndex !== 'number' || !Number.isInteger(rawPageIndex)) continue;
    pageIndexByBlock[blockId] = Math.max(0, Math.min(block.pageCount - 1, rawPageIndex));
  }
  const rawActiveBlockId = typeof source.activeBlockId === 'string' ? source.activeBlockId : null;
  const activeBlockId = rawActiveBlockId && allowedBlocks.has(rawActiveBlockId)
    ? rawActiveBlockId
    : blocks.find((block) => allowedBlocks.has(block.blockId))?.blockId ?? null;
  const allowedCoverKeys = new Set(blocks.flatMap((block) => block.coverKeys));
  const openedCoverKeys = Array.isArray(source.openedCoverKeys)
    ? [...new Set(source.openedCoverKeys.filter((key): key is string => typeof key === 'string' && allowedCoverKeys.has(key)))]
    : [];
  return { activeBlockId, pageIndexByBlock, openedCoverKeys };
}
