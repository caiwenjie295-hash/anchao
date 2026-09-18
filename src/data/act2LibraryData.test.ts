import { describe, expect, it } from 'vitest';
import {
  LIBRARY_CONCLUSION,
  LIBRARY_ENTRY_ID,
  LIBRARY_FLAG_IDS,
  LIBRARY_FORBIDDEN_TERMS,
  LIBRARY_NOTE_ID,
  LIBRARY_PLACEHOLDER_ASSET_ID,
  LIBRARY_SECTION_NAMES,
  act2Library,
  countMarkedCoreKeywords,
  isLibraryExcerptUnlocked,
  libraryCoreKeywords,
  libraryKeywordsByPageId,
  libraryPageById,
  libraryPagesByVolumeId,
  librarySectionById,
  libraryTargetPage,
  libraryTargetPageId,
  libraryVolumeById,
  validateLibraryData,
} from './act2LibraryData';

const allLibraryText = () =>
  [
    ...act2Library.sections.map((section) => section.summary),
    ...act2Library.volumes.map((volume) => volume.summary),
    ...act2Library.pages.flatMap((page) => [...page.paragraphs, page.title, page.heading]),
    ...act2Library.keywords.flatMap((keyword) => [keyword.label, keyword.gloss]),
    act2Library.excerpt.content,
    act2Library.completion.conclusion,
    act2Library.completion.detail,
  ].join('\n');

describe('act2 T03 library data', () => {
  it('passes its own validator', () => {
    expect(() => validateLibraryData()).not.toThrow();
  });

  it('keeps every collection id unique and referentially closed', () => {
    const { sections, volumes, pages, keywords } = act2Library;
    for (const items of [sections, volumes, pages, keywords]) {
      expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    }
    expect(volumes.every((volume) => librarySectionById.has(volume.sectionId))).toBe(true);
    expect(pages.every((page) => libraryVolumeById.has(page.volumeId))).toBe(true);
    expect(keywords.every((keyword) => libraryPageById.has(keyword.pageId))).toBe(true);
  });

  it('presents exactly the nine frozen catalog categories in order', () => {
    expect(act2Library.sections).toHaveLength(9);
    expect(act2Library.sections.map((section) => section.name)).toEqual([...LIBRARY_SECTION_NAMES]);
    expect(act2Library.sections.map((section) => section.id)).toEqual(
      LIBRARY_SECTION_NAMES.map((_name, index) => `SECTION_A2_T03_${String(index + 1).padStart(3, '0')}`),
    );
    expect(act2Library.sections.filter((section) => section.isCorrect)).toHaveLength(1);
  });

  it('keeps at least three volumes and six pages with continuous leaf numbers', () => {
    expect(act2Library.volumes.length).toBeGreaterThanOrEqual(3);
    expect(act2Library.pages.length).toBeGreaterThanOrEqual(6);
    for (const volume of act2Library.volumes) {
      const ordered = libraryPagesByVolumeId.get(volume.id) ?? [];
      expect(ordered.length).toBeGreaterThan(0);
      expect(ordered.map((page) => page.pageNumber)).toEqual(ordered.map((_page, index) => index + 1));
    }
  });

  it('hides the target page behind the correct section and at least one page turn', () => {
    const targetVolume = libraryVolumeById.get(act2Library.search.targetVolumeId);
    expect(targetVolume?.sectionId).toBe(act2Library.search.correctSectionId);
    expect(libraryTargetPage?.volumeId).toBe(act2Library.search.targetVolumeId);
    expect(libraryTargetPage?.isTarget).toBe(true);
    // 目标页非直达：不是卷首页，必须先翻页。
    expect(libraryTargetPage?.pageNumber).toBeGreaterThan(1);
    expect(libraryPagesByVolumeId.get(act2Library.search.targetVolumeId)?.[0]?.id).not.toBe(libraryTargetPageId);
    // 《补母志》不出现在初始顶层目录，只能经正确分区下的卷册进入。
    expect(act2Library.sections.some((section) => section.name.includes('补母志'))).toBe(false);
  });

  it('offers four target-page keywords whose core three cover the frozen meanings', () => {
    const targetKeywords = libraryKeywordsByPageId.get(libraryTargetPageId) ?? [];
    expect(targetKeywords.length).toBeGreaterThanOrEqual(4);
    expect(libraryCoreKeywords.length).toBeGreaterThanOrEqual(act2Library.requiredCoreKeywordCount);
    const meanings = libraryCoreKeywords.map((keyword) => keyword.coreMeaning);
    expect(meanings).toContain('fill-gap');
    expect(meanings).toContain('surplus-fills-deficit');
    expect(meanings).toContain('eating-grants-ability');
    expect(targetKeywords.every((keyword) => keyword.pageId === libraryTargetPageId)).toBe(true);
  });

  it('unlocks the excerpt only on the target page once three core keywords are marked', () => {
    const coreIds = libraryCoreKeywords.map((keyword) => keyword.id);
    expect(countMarkedCoreKeywords(coreIds.slice(0, 2))).toBe(2);
    expect(countMarkedCoreKeywords(coreIds.slice(0, 3))).toBe(act2Library.requiredCoreKeywordCount);
    expect(isLibraryExcerptUnlocked(libraryTargetPageId, [])).toBe(false);
    expect(isLibraryExcerptUnlocked(libraryTargetPageId, coreIds.slice(0, 2))).toBe(false);
    expect(isLibraryExcerptUnlocked(libraryTargetPageId, coreIds.slice(0, 3))).toBe(true);
    // 非目标页即使凑齐核心词也不得摘录。
    expect(isLibraryExcerptUnlocked('PAGE_A2_T03_001', coreIds)).toBe(false);
  });

  it('freezes excerpt, note, flag and placeholder ids', () => {
    expect(act2Library.excerpt.entryId).toBe(LIBRARY_ENTRY_ID);
    expect(act2Library.excerpt.noteId).toBe(LIBRARY_NOTE_ID);
    expect(act2Library.flags).toEqual({ ...LIBRARY_FLAG_IDS });
    expect(act2Library.scene.placeholderAssetId).toBe(LIBRARY_PLACEHOLDER_ASSET_ID);
    expect(act2Library.completion.conclusion).toBe(LIBRARY_CONCLUSION);
  });

  it('never leaks T04 memory, identity or personality material', () => {
    const text = allLibraryText();
    for (const term of LIBRARY_FORBIDDEN_TERMS) {
      expect(text).not.toContain(term);
    }
    expect(text).toContain('缺什么');
    expect(text).toContain('以有余补不足');
  });
});
