import type { Act4Stage } from '../../core/types';

export type Act4PresentationKind = 'record' | 'timeline' | 'first-person' | 'ending';
export type Act4SegmentRole = 'lead' | 'page' | 'ending' | 'whole';

export interface Act4TextSegment {
  id: string;
  label: string;
  from: number;
  to: number;
  role: Act4SegmentRole;
  sceneId?: string;
  sceneLabel?: string;
  sceneIndex?: number;
  scenePageIndex?: number;
  scenePageCount?: number;
}

export interface Act4PagePresentation {
  title?: string;
  periodLabel?: string;
  illustrationAssetId?: string;
  illustrationAlt?: string;
}

type Stage = Exclude<Act4Stage, 'inactive'>;
const segment = (id: string, label: string, from: number, to: number, role: Act4SegmentRole = 'page'): Act4TextSegment => ({ id, label, from, to, role });

const EXPLICIT_SEGMENTS: Record<string, readonly Act4TextSegment[]> = {
  'T01:T01_ORIGINAL': [
    segment('T01_SETUP', '回到酒店', 0, 4, 'lead'),
    ...Array.from({ length: 8 }, (_, index) => segment(`T01_NOTE_${index + 1}`, `笔记第 ${index + 1} 页`, index + 4, index + 5)),
    segment('T01_NOTE_9', '笔记第 9 页', 12, 19),
    segment('T01_AFTER_NOTE', '读完最后一页', 19, 20, 'ending'),
  ],
  'T02:T02_ORIGINAL': [
    segment('T02_CONTEXT', '“那一天”', 0, 10),
    segment('T02_PROTAGONIST_MAIL', '主角收到的邮件', 10, 15),
    segment('T02_XIAOYUE_MAIL', '小月收到的邮件', 15, 21),
    segment('T02_DATE_COMPARISON', '对照发送日期', 21, 23),
  ],
  'T03:T03_ORIGINAL': [
    segment('T03_WEIBO_HEADING', '微博记录', 0, 1, 'lead'),
    ...Array.from({ length: 14 }, (_, index) => segment(`T03_POST_${index + 1}`, '按日期查看', index * 2 + 1, index * 2 + 3)),
    segment('T03_REACTION', '读完记录', 29, 30, 'ending'),
  ],
  'T05:T05_ORIGINAL': [
    segment('T05_EVENING_STUDY', '晚自习', 0, 3),
    segment('T05_TEACHER_OFFICE', '李老师的办公室', 3, 8),
    segment('T05_BIRTHDAY_DAY', '生日白天', 8, 13),
    segment('T05_FAMILY_DINNER', '家庭晚餐', 13, 17),
    segment('T05_TAKEN', '门外来人', 17, 23),
  ],
  'T06:T06_ORIGINAL': [
    segment('T06_ARRIVAL', '入所与配餐', 0, 5),
    segment('T06_BROADCASTS', '早晚广播', 5, 9),
    segment('T06_ESCAPE_PLAN', '逃离计划', 9, 11),
    segment('T06_CONFINEMENT', '禁闭室', 11, 17),
  ],
  'T07:T07_ORIGINAL': [
    segment('T07_FIRST_DREAMS', '早读与梦境', 0, 4),
    segment('T07_NAMES', '梦里的姓名', 4, 9),
    segment('T07_KITCHEN_RETURN', '厨房与回校', 9, 13),
  ],
  'T08:T08_RETURN': [
    segment('T08_WAKE', '四月三日醒来', 0, 11),
    segment('T08_LAKE', '湖边的回忆', 11, 16),
    segment('T08_CAMPUS', '校园日常', 16, 21),
    segment('T08_DECISION', '决定返山', 21, 27),
    segment('T08_FOOTHILL', '山脚准备', 27, 33),
    segment('T08_WALL', '翻墙与受伤', 33, 46),
    segment('T08_RETURN_TO_SITE', '重新进入旧址', 46, 54),
    segment('T08_BROADCAST_ROOM', '广播室到档案馆', 54, 66),
  ],
  'T08:T08_ARCHIVE': [
    segment('T08_ARCHIVE_SHELVES', '档案编号', 0, 4),
    segment('T08_ARCHIVE_DOSSIER', '翻开档案', 4, 8),
    segment('T08_ARCHIVE_MIRROR', '镜面中的人', 8, 15),
    segment('T08_ARCHIVE_STEPS', '脚步声', 15, 19),
  ],
  'T08:T08_KITCHEN_ESCAPE': [
    segment('T08_KITCHEN_VIEW', '厨房里的景象', 0, 5),
    segment('T08_KITCHEN_REACTION', '难以确认的恐惧', 5, 9),
    segment('T08_KITCHEN_RETREAT', '往回走', 9, 13),
    segment('T08_FIRE_BOX', '倒在消防箱旁', 13, 20),
  ],
  'T09:T09_REPLY_AND_LAST_PAGE': [
    segment('T09_REPLY', '收到回信', 0, 5),
    segment('T09_LAST_PAGE', '写下最后一页', 5, 8),
  ],
  'T10:T10_AFTERMATH': [
    segment('T10_SEARCH', '追查无果', 0, 6),
    segment('T10_WORDS', '两个词的联想', 6, 9),
    segment('T10_KITCHEN_MEMORY', '厨房里的疑问', 9, 13),
    segment('T10_DAILY_LIFE', '三杯与日常', 13, 19),
    segment('T10_MESSAGES', '后来往来', 19, 23),
  ],
};

const PRESENTATION_BY_STAGE: Record<Stage, Act4PresentationKind> = {
  T01: 'record', T02: 'record', T03: 'timeline', T04: 'record',
  T05: 'first-person', T06: 'first-person', T07: 'first-person', T08: 'first-person', T09: 'first-person',
  T10: 'ending',
};

const CONTINUOUS_BLOCKS = new Set(['T09:T09_BROADCAST']);

type SceneArtwork = { assetId: string; alt: string };

const FIRST_PERSON_PAGE_ART: Partial<Record<Stage, readonly SceneArtwork[]>> = {
  T05: [
    { assetId: 'IMG_A4_T05_001', alt: '王澳在晚自习时把日记藏在练习册下' },
    { assetId: 'IMG_A4_T05_002', alt: '李老师办公室里的茶杯与桌面' },
    { assetId: 'IMG_A4_T05_003', alt: '王澳生日当天回家的门厅与早饭' },
    { assetId: 'IMG_A4_T05_005', alt: '生日晚餐中父母交换眼色' },
    { assetId: 'IMG_A4_T05_006', alt: '王澳从房门缝边的镜面观察门外来人' },
  ],
  T06: [
    { assetId: 'IMG_A4_T06_002', alt: '王澳在机构吃到的固定早餐' },
    { assetId: 'IMG_A4_T06_004', alt: '机构走廊中的早晚广播设备' },
    { assetId: 'IMG_A4_T06_005', alt: '床铺上的纸团与逃离计划' },
    { assetId: 'IMG_A4_T06_007', alt: '2014 年仍在使用的禁闭室铁门，保留三个观察孔与送餐口' },
  ],
  T07: [
    { assetId: 'IMG_A4_T07_001', alt: '王澳梦中陌生城市的校园' },
    { assetId: 'IMG_A4_T07_004', alt: '王澳在梦里的镜前视角' },
    { assetId: 'IMG_A4_T07_005', alt: '机构地下厨房深处的黑色塑像' },
  ],
};

const BLOCK_PAGE_ART: Record<string, readonly (SceneArtwork | undefined)[]> = {
  'T08:T08_RETURN': [
    { assetId: 'IMG_A4_T08_001', alt: '大学宿舍清晨，王澳查看手机邮件' },
    { assetId: 'IMG_A4_T08_002', alt: '王澳独自坐在湖边长椅上' },
    { assetId: 'IMG_A4_T08_011', alt: '大学校园里的日常生活' },
    { assetId: 'IMG_A4_T08_003', alt: '手机发信后准备夜行出发' },
    { assetId: 'IMG_A4_T08_004', alt: '山脚下准备上山的王澳' },
    { assetId: 'IMG_A4_T08_006', alt: '王澳翻越带有碎玻璃的围墙' },
    { assetId: 'IMG_A4_T08_005', alt: '凌晨时分通往旧址的道路' },
    { assetId: 'IMG_A4_T08_007', alt: '王澳进入启明旧址的广播室' },
  ],
  'T08:T08_ARCHIVE': [
    { assetId: 'IMG_A4_T08_008', alt: '启明旧址档案架与编号' },
    { assetId: 'IMG_A4_T08_008', alt: '王澳翻看档案' },
    { assetId: 'IMG_A4_READING_DETAIL_001', alt: '手机微光落在档案室的不锈钢书架上，反光里的轮廓难以辨认' },
    { assetId: 'IMG_A4_T08_008', alt: '档案室里传来的脚步声' },
  ],
  'T08:T08_KITCHEN_ESCAPE': [
    { assetId: 'IMG_A4_T08_010', alt: '启明旧址厨房里的景象' },
    undefined,
    undefined,
    { assetId: 'IMG_A4_T08_012', alt: '王澳逃出厨房后，倒在消防栓旁的低视角' },
  ],
  'T09:T09_REPLY_AND_LAST_PAGE': [
    { assetId: 'IMG_A4_T09_002', alt: '手机上收到的回信' },
    { assetId: 'IMG_A4_T09_003', alt: '王澳写下笔记的最后一页' },
  ],
  'T09:T09_NOTE_HIDDEN': [
    { assetId: 'IMG_A4_T09_001', alt: '消防栓旁等待藏好的笔记' },
  ],
  'T09:T09_WALK_TO_DOOR': [
    { assetId: 'IMG_A4_T09_004', alt: '王澳走向旧址出口' },
  ],
  'T09:T09_BROADCAST': [
    { assetId: 'IMG_A4_T09_005', alt: '旧址门槛与门外的晨光' },
  ],
  'T10:T10_FINAL_MAIL': [
    { assetId: 'IMG_A4_FINAL_READING_001', alt: '桌灯旁摊开的无字纸张与模糊屏幕，邮件内容不可辨认' },
  ],
};

export function act4PresentationKind(stage: Stage): Act4PresentationKind {
  return PRESENTATION_BY_STAGE[stage];
}

export function act4PagePresentation(stage: Stage, pageIndex: number, blockId?: string, pageLabel?: string, sceneIndex = pageIndex): Act4PagePresentation | undefined {
  const art = (blockId ? BLOCK_PAGE_ART[`${stage}:${blockId}`] : undefined) ?? FIRST_PERSON_PAGE_ART[stage];
  if (!art?.length) return undefined;
  const index = Math.max(0, Math.min(art.length - 1, sceneIndex));
  const presentation: Act4PagePresentation = art[index] ? {
    illustrationAssetId: art[index]!.assetId,
    illustrationAlt: art[index]!.alt,
  } : {};
  if (stage === 'T05') {
    const pages = EXPLICIT_SEGMENTS['T05:T05_ORIGINAL'].filter((item) => item.role === 'page');
    presentation.title = pages[index].label;
    presentation.periodLabel = index < 2 ? '2014 年 12 月 28 日' : '2014 年 12 月 29 日';
  } else if (pageLabel) {
    presentation.title = pageLabel;
  }
  return presentation;
}

export function act4TextSegments(stage: Stage, blockId: string, paragraphCount: number): readonly Act4TextSegment[] {
  const key = `${stage}:${blockId}`;
  const explicit = EXPLICIT_SEGMENTS[key];
  if (explicit) return explicit;
  if (CONTINUOUS_BLOCKS.has(key) || paragraphCount <= 6) return [segment(`${blockId}_WHOLE`, '', 0, paragraphCount, 'whole')];

  const pageSize = 6;
  const pages: Act4TextSegment[] = [];
  for (let from = 0; from < paragraphCount; from += pageSize) {
    const number = pages.length + 1;
    pages.push(segment(`${blockId}_PART_${number}`, `第 ${number} 段`, from, Math.min(paragraphCount, from + pageSize)));
  }
  return pages;
}

const SCENE_PAGED_STAGES = new Set<Stage>(['T05', 'T06', 'T07', 'T08', 'T09']);
const SCENE_LABEL_FALLBACKS: Record<string, string> = {
  'T09:T09_NOTE_HIDDEN': '藏好最后一页笔记',
  'T09:T09_WALK_TO_DOOR': '走向门外',
  'T09:T09_BROADCAST': '门外的广播',
};
const MAX_READER_PAGE_CHARACTERS = 560;
const MAX_READER_PAGE_PARAGRAPHS = 6;

/** Keeps existing scene ranges intact while splitting their complete paragraphs into readable pages. */
export function act4ReaderTextPages(
  stage: Stage,
  blockId: string,
  paragraphs: readonly string[],
  includeSceneCovers: boolean,
): readonly Act4TextSegment[] {
  const sourceSegments = act4TextSegments(stage, blockId, paragraphs.length);
  if (!includeSceneCovers || !SCENE_PAGED_STAGES.has(stage)) {
    return sourceSegments;
  }

  let sceneIndex = 0;
  return sourceSegments.flatMap((sourceSegment) => {
    if (sourceSegment.role !== 'page' && sourceSegment.role !== 'whole') return [sourceSegment];
    const currentSceneIndex = sceneIndex;
    sceneIndex += 1;
    const sceneLabel = sourceSegment.label || SCENE_LABEL_FALLBACKS[`${stage}:${blockId}`] || '';
    if (CONTINUOUS_BLOCKS.has(`${stage}:${blockId}`)) return [{
      ...sourceSegment,
      sceneId: sourceSegment.id,
      sceneLabel,
      sceneIndex: currentSceneIndex,
      scenePageIndex: 0,
      scenePageCount: 1,
    }];
    const pages: Act4TextSegment[] = [];
    let pageFrom = sourceSegment.from;
    while (pageFrom < sourceSegment.to) {
      let pageTo = pageFrom + 1;
      let characterCount = paragraphs[pageFrom].length;
      while (
        pageTo < sourceSegment.to
        && pageTo - pageFrom < MAX_READER_PAGE_PARAGRAPHS
        && characterCount + paragraphs[pageTo].length <= MAX_READER_PAGE_CHARACTERS
      ) {
        characterCount += paragraphs[pageTo].length;
        pageTo += 1;
      }
      const pageNumber = pages.length + 1;
      pages.push({
        ...sourceSegment,
        id: `${sourceSegment.id}_TEXT_${pageNumber}`,
        label: sourceSegment.label,
        from: pageFrom,
        to: pageTo,
      });
      pageFrom = pageTo;
    }
    return pages.map((page, scenePageIndex) => ({
      ...page,
      sceneId: sourceSegment.id,
      sceneLabel,
      sceneIndex: currentSceneIndex,
      scenePageIndex,
      scenePageCount: pages.length,
    }));
  });
}

/** The earlier reader used six-paragraph source chunks and a 440-character / three-paragraph page budget. */
export function act4LegacyReaderTextPages(
  stage: Stage,
  blockId: string,
  paragraphs: readonly string[],
  includeSceneCovers: boolean,
): readonly Act4TextSegment[] {
  const key = `${stage}:${blockId}`;
  // Keep baseline scene IDs and ranges; only restore the old page budget inside them.
  const legacySegments = act4TextSegments(stage, blockId, paragraphs.length);

  if (!includeSceneCovers || !SCENE_PAGED_STAGES.has(stage)) return legacySegments;
  let sceneIndex = 0;
  return legacySegments.flatMap((sourceSegment) => {
    if (sourceSegment.role !== 'page' && sourceSegment.role !== 'whole') return [sourceSegment];
    const currentSceneIndex = sceneIndex++;
    if (CONTINUOUS_BLOCKS.has(key)) return [{
      ...sourceSegment, sceneId: sourceSegment.id, sceneLabel: sourceSegment.label,
      sceneIndex: currentSceneIndex, scenePageIndex: 0, scenePageCount: 1,
    }];
    const pages: Act4TextSegment[] = [];
    let from = sourceSegment.from;
    while (from < sourceSegment.to) {
      let to = from + 1;
      let characterCount = paragraphs[from].length;
      while (to < sourceSegment.to && to - from < 3 && characterCount + paragraphs[to].length <= 440) {
        characterCount += paragraphs[to].length;
        to += 1;
      }
      pages.push({ ...sourceSegment, id: `${sourceSegment.id}_TEXT_${pages.length + 1}`, from, to });
      from = to;
    }
    return pages.map((page, scenePageIndex) => ({
      ...page, sceneId: sourceSegment.id, sceneLabel: sourceSegment.label,
      sceneIndex: currentSceneIndex, scenePageIndex, scenePageCount: pages.length,
    }));
  });
}

/** Reopens the new page that contains the first paragraph of a saved page from the former layout. */
export function act4CompatibleReaderPageIndex(
  stage: Stage,
  blockId: string,
  paragraphs: readonly string[],
  pages: readonly Act4TextSegment[],
  requestedLegacyPageIndex: number,
  includeSceneCovers: boolean,
): number {
  const previousPages = act4LegacyReaderTextPages(stage, blockId, paragraphs, includeSceneCovers)
    .filter((item) => item.role === 'page' || item.role === 'whole');
  const previousPage = previousPages[Math.max(0, Math.min(previousPages.length - 1,
    Number.isInteger(requestedLegacyPageIndex) ? requestedLegacyPageIndex : 0))];
  if (!previousPage) return 0;
  const readablePages = pages.filter((page) => page.role === 'page' || page.role === 'whole');
  const matchingPage = readablePages.findIndex((page) => previousPage.from >= page.from && previousPage.from < page.to);
  return matchingPage < 0 ? 0 : matchingPage;
}

export interface Act4PrivateBlogPost {
  dateText: string;
  dateTime: string;
  text: string;
}

/** Keeps the original date/body pairs intact; surrounding prose stays outside the post list. */
export function act4PrivateBlogPosts(paragraphs: readonly string[]): readonly Act4PrivateBlogPost[] {
  const posts: Act4PrivateBlogPost[] = [];
  for (let index = 1; index + 1 < paragraphs.length - 1; index += 2) {
    const dateText = paragraphs[index];
    const dateTime = act4DateTimeValue(dateText);
    if (!dateTime) return [];
    posts.push({ dateText, dateTime, text: paragraphs[index + 1] });
  }
  return posts;
}

export type Act4ParagraphKind = 'mail-field' | 'mail-body' | 'social-date' | 'social-post' | 'broadcast-word' | 'broadcast-response' | 'broadcast-ending';

export function act4ParagraphKind(stage: Stage, blockId: string, index: number, text: string): Act4ParagraphKind | undefined {
  if (stage === 'T03' && blockId === 'T03_ORIGINAL') {
    if (/^2020 年 4 月 \d{1,2} 日$/.test(text)) return 'social-date';
    if (index > 0 && index < 29) return 'social-post';
  }

  if (stage === 'T09' && blockId === 'T09_BROADCAST') {
    if ([1, 3, 5, 7, 9, 11].includes(index)) return 'broadcast-word';
    if (index === 12 || index === 13) return 'broadcast-ending';
    return 'broadcast-response';
  }

  const mailRange = stage === 'T02' && blockId === 'T02_ORIGINAL' && ((index >= 10 && index <= 14) || (index >= 16 && index <= 20))
    || stage === 'T04' && blockId === 'T04_ORIGINAL' && index >= 1
    || stage === 'T08' && blockId === 'T08_RETURN' && index >= 1 && index <= 9
    || stage === 'T09' && blockId === 'T09_REPLY_AND_LAST_PAGE' && index <= 3
    || stage === 'T10' && blockId === 'T10_FINAL_MAIL';
  if (!mailRange) return undefined;
  if (/^(主题|发件人|时间|正文|定位)：/.test(text)) return 'mail-field';
  return 'mail-body';
}

export function act4DateTimeValue(text: string): string | undefined {
  const match = text.match(/^(\d{4}) 年 (\d{1,2}) 月 (\d{1,2}) 日$/);
  return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : undefined;
}
