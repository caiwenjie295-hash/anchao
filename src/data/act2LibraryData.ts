import libraryDocument from '../../data/act2_library.json';

/** T03 目录门类：与工单冻结的九类噪音逐字一致，顺序即展示顺序。 */
export const LIBRARY_SECTION_NAMES = [
  '地理沿革',
  '山川河流',
  '风俗',
  '祠庙',
  '乡贤',
  '农业',
  '灾害',
  '方言',
  '地方传说',
] as const;

/** T03 冻结 Flag：工单要求内容控制器只消费/写入这四个故事 Flag。 */
export const LIBRARY_FLAG_IDS = {
  entered: 'FLAG_A2_LIBRARY_ENTERED',
  gazetteFound: 'FLAG_A2_LOCAL_GAZETTE_FOUND',
  bumuzhiFound: 'FLAG_A2_BUMUZHI_FOUND',
  ruleKnown: 'FLAG_A2_BUMU_RULE_BASIC_KNOWN',
} as const;

export const LIBRARY_ENTRY_ID = 'ENTRY_A2_T03_001';
export const LIBRARY_NOTE_ID = 'NOTE_A2_T03_001';
export const LIBRARY_PLACEHOLDER_ASSET_ID = 'IMG_A2_T03_001';
export const LIBRARY_CONCLUSION = '缺什么，就用某种东西补什么。';

/**
 * T04 禁词：T03 只允许揭示“补缺 / 以有余补不足 / 食用来源获得对应能力 / 民间供奉”，
 * 不得提前写出记忆、身份、性格转移的结论或三个案例。
 */
export const LIBRARY_FORBIDDEN_TERMS = [
  '记忆',
  '身份',
  '性格',
  '转移',
  '附身',
  '夺舍',
  '转世',
  '人格',
  '案例一',
  '案例二',
  '案例三',
] as const;

export type LibraryCoreMeaning = 'fill-gap' | 'surplus-fills-deficit' | 'eating-grants-ability';

export interface LibraryRecord {
  id: string;
  title: string;
  act: number;
  phase: string;
  source: string;
  purpose: string;
  unlockCondition: string[];
  relatedFlags: string[];
  notes: string;
}

export interface LibrarySceneCopy {
  eyebrow: string;
  title: string;
  intro: string;
  ambience: string;
  catalogTitle: string;
  catalogHint: string;
  catalogNoiseNote: string;
  shelfTitle: string;
  readerInstruction: string;
  returnLabel: string;
  placeholderAssetId: string;
}

export interface LibrarySection {
  id: string;
  name: string;
  summary: string;
  isCorrect: boolean;
}

export interface LibraryVolume {
  id: string;
  sectionId: string;
  title: string;
  spine: string;
  summary: string;
}

export interface LibraryPage {
  id: string;
  volumeId: string;
  pageNumber: number;
  leafLabel: string;
  title: string;
  heading: string;
  paragraphs: string[];
  isTarget?: boolean;
}

export interface LibraryKeyword {
  id: string;
  pageId: string;
  label: string;
  gloss: string;
  core: boolean;
  coreMeaning?: LibraryCoreMeaning;
}

export interface LibraryExcerpt {
  entryId: string;
  noteId: string;
  title: string;
  content: string;
}

export interface LibraryCompletion {
  title: string;
  conclusion: string;
  detail: string;
}

export interface Act2LibraryData {
  schemaVersion: number;
  record: LibraryRecord;
  scene: LibrarySceneCopy;
  search: { correctSectionId: string; targetVolumeId: string; targetPageId: string };
  flags: { entered: string; gazetteFound: string; bumuzhiFound: string; ruleKnown: string };
  sections: LibrarySection[];
  volumes: LibraryVolume[];
  pages: LibraryPage[];
  keywords: LibraryKeyword[];
  excerpt: LibraryExcerpt;
  requiredCoreKeywordCount: number;
  completion: LibraryCompletion;
}

export const act2Library = libraryDocument as unknown as Act2LibraryData;

export const librarySectionById = new Map(act2Library.sections.map((section) => [section.id, section]));
export const libraryVolumeById = new Map(act2Library.volumes.map((volume) => [volume.id, volume]));
export const libraryPageById = new Map(act2Library.pages.map((page) => [page.id, page]));
export const libraryKeywordById = new Map(act2Library.keywords.map((keyword) => [keyword.id, keyword]));

export const libraryVolumes = act2Library.volumes;
export const librarySections = act2Library.sections;
export const librarySceneCopy = act2Library.scene;
export const libraryCompletion = act2Library.completion;
export const libraryExcerpt = act2Library.excerpt;
export const libraryFlagIds = LIBRARY_FLAG_IDS;
export const libraryEntryId = LIBRARY_ENTRY_ID;
export const libraryNoteId = LIBRARY_NOTE_ID;
export const libraryCorrectSectionId = act2Library.search.correctSectionId;
export const libraryTargetVolumeId = act2Library.search.targetVolumeId;
export const libraryTargetPageId = act2Library.search.targetPageId;
export const libraryRequiredCoreKeywordCount = act2Library.requiredCoreKeywordCount;

export const libraryPagesByVolumeId = new Map(
  act2Library.volumes.map((volume) => [
    volume.id,
    act2Library.pages.filter((page) => page.volumeId === volume.id).sort((left, right) => left.pageNumber - right.pageNumber),
  ]),
);
export const libraryKeywordsByPageId = new Map(
  act2Library.pages.map((page) => [page.id, act2Library.keywords.filter((keyword) => keyword.pageId === page.id)]),
);

export const libraryCoreKeywords = act2Library.keywords.filter((keyword) => keyword.core);
export const libraryTargetPage = libraryPageById.get(libraryTargetPageId) ?? null;

export const countMarkedCoreKeywords = (markedKeywordIds: string[]): number =>
  libraryCoreKeywords.filter((keyword) => markedKeywordIds.includes(keyword.id)).length;

export const isLibraryTargetPage = (pageId: string | null): boolean => pageId === libraryTargetPageId;

export const isLibraryExcerptUnlocked = (pageId: string | null, markedKeywordIds: string[]): boolean =>
  isLibraryTargetPage(pageId) && countMarkedCoreKeywords(markedKeywordIds) >= libraryRequiredCoreKeywordCount;

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const hasUniqueIds = (items: { id: string }[]): boolean => new Set(items.map((item) => item.id)).size === items.length;
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');

const collectLibraryText = (): string => {
  const { record, scene, sections, volumes, pages, keywords, excerpt, completion } = act2Library;
  return [
    record.title,
    record.purpose,
    record.notes,
    Object.values(scene).join('\n'),
    ...sections.flatMap((section) => [section.name, section.summary]),
    ...volumes.flatMap((volume) => [volume.title, volume.spine, volume.summary]),
    ...pages.flatMap((page) => [page.title, page.heading, page.leafLabel, ...page.paragraphs]),
    ...keywords.flatMap((keyword) => [keyword.label, keyword.gloss]),
    excerpt.title,
    excerpt.content,
    completion.title,
    completion.conclusion,
    completion.detail,
  ].join('\n');
};

/** 数据自检：ID/引用唯一、九类目录完整、卷页关系、目标页非直达、核心关键词数量与 T04 禁词。 */
export function validateLibraryData(): void {
  const { record, sections, volumes, pages, keywords, search, flags, excerpt, scene, completion } = act2Library;

  if (
    !isNonEmptyString(record.id) ||
    !isNonEmptyString(record.title) ||
    record.act !== 2 ||
    record.phase !== 'A2_T03' ||
    !isNonEmptyString(record.source) ||
    !isNonEmptyString(record.purpose) ||
    !isNonEmptyString(record.notes) ||
    !isStringArray(record.unlockCondition) ||
    !isStringArray(record.relatedFlags)
  ) {
    throw new Error('act2_library.json 顶层可追溯记录无效。');
  }

  if (sections.length !== LIBRARY_SECTION_NAMES.length) throw new Error('T03 目录必须且只能包含九类。');
  if (!hasUniqueIds(sections)) throw new Error('T03 目录分区 ID 重复。');
  sections.forEach((section, index) => {
    if (!isNonEmptyString(section.id) || !isNonEmptyString(section.name) || !isNonEmptyString(section.summary)) throw new Error(`T03 目录分区字段无效：${section.id}`);
    if (section.id !== `SECTION_A2_T03_${String(index + 1).padStart(3, '0')}`) throw new Error(`T03 目录分区 ID 必须为 SECTION_A2_T03_00x：${section.id}`);
    if (section.name !== LIBRARY_SECTION_NAMES[index]) throw new Error(`T03 目录分区顺序或名称不符：${section.name}`);
  });
  const correctSections = sections.filter((section) => section.isCorrect);
  if (correctSections.length !== 1 || correctSections[0].id !== search.correctSectionId) throw new Error('T03 正确分区必须唯一且与 search.correctSectionId 一致。');

  if (volumes.length < 3 || !hasUniqueIds(volumes)) throw new Error('T03 至少需要三个卷册且 ID 唯一。');
  for (const volume of volumes) {
    if (!isNonEmptyString(volume.title) || !isNonEmptyString(volume.spine) || !isNonEmptyString(volume.summary)) throw new Error(`T03 卷册字段无效：${volume.id}`);
    if (!librarySectionById.has(volume.sectionId)) throw new Error(`T03 卷册引用了未知分区：${volume.id}`);
  }

  if (pages.length < 6 || !hasUniqueIds(pages)) throw new Error('T03 至少需要六个页面且 ID 唯一。');
  for (const page of pages) {
    if (!libraryVolumeById.has(page.volumeId) || !isNonEmptyString(page.title) || !isNonEmptyString(page.heading) || !isNonEmptyString(page.leafLabel)) throw new Error(`T03 页面字段无效：${page.id}`);
    if (!Number.isInteger(page.pageNumber) || page.pageNumber < 1) throw new Error(`T03 页面编号无效：${page.id}`);
    if (!Array.isArray(page.paragraphs) || page.paragraphs.length === 0 || !page.paragraphs.every(isNonEmptyString)) throw new Error(`T03 页面正文无效：${page.id}`);
  }
  for (const volume of volumes) {
    const ordered = libraryPagesByVolumeId.get(volume.id) ?? [];
    if (ordered.length === 0) throw new Error(`T03 卷册缺少页面：${volume.id}`);
    if (ordered.map((page) => page.pageNumber).join('|') !== ordered.map((_page, index) => index + 1).join('|')) throw new Error(`T03 卷册页面编号必须从 1 连续：${volume.id}`);
  }

  if (!libraryTargetPage || libraryTargetPage.volumeId !== search.targetVolumeId) throw new Error('T03 目标页必须属于目标卷册。');
  if (pages.filter((page) => page.isTarget).length !== 1) throw new Error('T03 只允许一个目标页。');
  const targetVolume = libraryVolumeById.get(search.targetVolumeId);
  if (!targetVolume || targetVolume.sectionId !== search.correctSectionId) throw new Error('T03 目标卷册必须挂在正确分区下。');
  if (libraryTargetPage.pageNumber <= 1) throw new Error('T03 目标页不得直达，必须先翻页。');

  if (keywords.length < 4 || !hasUniqueIds(keywords)) throw new Error('T03 目标页至少需要四个关键词且 ID 唯一。');
  const targetKeywords = keywords.filter((keyword) => keyword.pageId === search.targetPageId);
  if (targetKeywords.length < 4) throw new Error('T03 目标页至少需要四个可点击关键词。');
  for (const keyword of keywords) {
    if (!libraryPageById.has(keyword.pageId) || !isNonEmptyString(keyword.label) || !isNonEmptyString(keyword.gloss)) throw new Error(`T03 关键词字段无效：${keyword.id}`);
    if (keyword.core && !keyword.coreMeaning) throw new Error(`T03 核心关键词必须声明 coreMeaning：${keyword.id}`);
  }
  const coreKeywords = keywords.filter((keyword) => keyword.core);
  const requiredMeanings: LibraryCoreMeaning[] = ['fill-gap', 'surplus-fills-deficit', 'eating-grants-ability'];
  if (coreKeywords.length < act2Library.requiredCoreKeywordCount) throw new Error('T03 核心关键词数量不足。');
  if (!requiredMeanings.every((meaning) => coreKeywords.some((keyword) => keyword.coreMeaning === meaning))) throw new Error('T03 核心关键词未覆盖补缺 / 有余补不足 / 食用来源获得对应能力。');

  if (excerpt.entryId !== LIBRARY_ENTRY_ID || excerpt.noteId !== LIBRARY_NOTE_ID) throw new Error('T03 摘录与笔记 ID 必须使用冻结值。');
  if (!isNonEmptyString(excerpt.title) || !isNonEmptyString(excerpt.content)) throw new Error('T03 摘录内容不得为空。');

  if (
    flags.entered !== LIBRARY_FLAG_IDS.entered ||
    flags.gazetteFound !== LIBRARY_FLAG_IDS.gazetteFound ||
    flags.bumuzhiFound !== LIBRARY_FLAG_IDS.bumuzhiFound ||
    flags.ruleKnown !== LIBRARY_FLAG_IDS.ruleKnown
  ) {
    throw new Error('T03 Flag 必须使用契约冻结名称。');
  }
  if (completion.conclusion !== LIBRARY_CONCLUSION) throw new Error('T03 完成结论必须是“缺什么，就用某种东西补什么。”');
  if (scene.placeholderAssetId !== LIBRARY_PLACEHOLDER_ASSET_ID) throw new Error('T03 资源空位必须使用 IMG_A2_T03_001。');

  const text = collectLibraryText();
  for (const term of LIBRARY_FORBIDDEN_TERMS) {
    if (text.includes(term)) throw new Error(`T03 不得提前出现 T04 内容：${term}`);
  }
}

validateLibraryData();
