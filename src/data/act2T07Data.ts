import document from '../../data/act2_t07.json';
import flagsDocument from '../../data/flags.json';
import notesDocument from '../../data/notes.json';
import browserPagesDocument from '../../data/browser_pages.json';
import imagesDocument from '../../data/images.json';

export type T07Cue = { id: string; label: string; file: string | null };

export type T07Material = {
  id: string;
  kind: 'photo' | 'video';
  title: string;
  imageId: string;
  altText: string;
  placeholderLabel: string;
  placeholderNote: string;
  caption: string;
  openLabel: string;
  xiaoyueLine?: string;
  cornerNote?: string;
  zoomLabel?: string;
  symbolNote?: string;
  logoSpeculation?: string;
  confirmLabel?: string;
  confirmedNote?: string;
};

export type T07Segment = {
  id: string;
  shotId: string;
  startMs: number;
  endMs: number;
  label: string;
  imageId: string;
  placeholderNote: string;
  line: string;
};

export type T07FrameKind = 'temple' | 'trail' | 'interview';

export type T07KeyFrame = {
  id: string;
  segmentId: string;
  startMs: number;
  endMs: number;
  imageId: string;
  zoomImageId: string;
  altText: string;
  placeholderNote: string;
  caption: string;
  supportsExteriorMatch: boolean;
  /** P05：胶片分型；非外景帧静音标签用 muteLabel。 */
  frameKind: T07FrameKind;
  muteLabel?: string;
};

export type T07VisualFrame = { startMs: number; endMs: number; imageId: string };

export type Act2T07Data = {
  schemaVersion: number;
  record: { id: string; title: string; act: number; phase: string; source: string; purpose: string; unlockCondition: string[]; relatedFlags: string[]; notes: string };
  entryLabel: string;
  resumeLabel: string;
  intro: string;
  photoMaterialId: string;
  promoSurfaceText: string[];
  promoSurfaceNote: string;
  materials: T07Material[];
  video: {
    materialId: string;
    title: string;
    durationMs: number;
    frameMs: number;
    stepMs: number;
    requiredSegmentIds: string[];
    continuityNote: string;
    segments: T07Segment[];
    keyFrames: T07KeyFrame[];
    visualFrames: T07VisualFrame[];
    captureHint: string;
    captureLabel: string;
    captureOutsideLabel: string;
    screenshotZoomLabel: string;
    watchedNote: string;
  };
  comparison: {
    exteriorImageId: string;
    exteriorCaption: string;
    exteriorAltText: string;
    exteriorNote: string;
    trailReference: { imageId: string; caption: string; altText: string; note: string };
    guide: { steps: [string, string, string]; findCapturedTemple: string; findTempleInVideo: string; confirmedStep: string };
    openLabel: string;
    zoomLabel: string;
    zoomBothHint: string;
    compareLabel: string;
    confirmLabel: string;
    structureNote: string;
    xiaoyueLine: string;
    replyLine: string;
    lockedHint: string;
    featureOptions: { id: string; label: string }[];
    matchFeatureId: string;
    mismatchNote: string;
    /** P05：按帧型/特征分叉的失败提示（提交校验仍只用 matchFeatureId）。 */
    mismatchNotesByKind: {
      trail: string;
      interview: string;
      templeRoad: string;
      templeOther: string;
    };
  };
  inference: { title: string; jigonglingBranch: string[]; qimingBranch: string[]; conclusion: string; confirmLabel: string; caveat: string; lockedHint: string };
  trip: { title: string; lines: { speaker: string; text: string }[]; gearImageId: string; gearCaption: string; gearAltText: string; gearNote: string; confirmLabel: string; plannedNote: string; lockedHint: string };
  finale: { cues: T07Cue[]; lines: string[]; continueLabel: string; replayLabel: string; closingNote: string };
};

export const act2T07 = document as Act2T07Data;
export const materialById = new Map(act2T07.materials.map((material) => [material.id, material]));
export const segmentById = new Map(act2T07.video.segments.map((segment) => [segment.id, segment]));
export const keyFrameById = new Map(act2T07.video.keyFrames.map((frame) => [frame.id, frame]));
export const ACT2_T07_MATERIAL_IDS = act2T07.materials.map((material) => material.id);
export const ACT2_T07_SEGMENT_IDS = act2T07.video.segments.map((segment) => segment.id);
export const ACT2_T07_FRAME_IDS = act2T07.video.keyFrames.map((frame) => frame.id);

export const isAct2T07MaterialId = (id: string): boolean => materialById.has(id);
export const isAct2T07SegmentId = (id: string): boolean => segmentById.has(id);
export type T07ComparisonReference = { imageId: string; caption: string; altText: string; note: string };
/** Trees share visual context; only the temple and interview frames use the historic temple photograph. */
export const comparisonReferenceForFrame = (frame: Pick<T07KeyFrame, 'frameKind'> | undefined): T07ComparisonReference =>
  frame?.frameKind === 'trail'
    ? act2T07.comparison.trailReference
    : {
      imageId: act2T07.comparison.exteriorImageId,
      caption: act2T07.comparison.exteriorCaption,
      altText: act2T07.comparison.exteriorAltText,
      note: act2T07.comparison.exteriorNote,
    };

export const segmentAt = (timeMs: number): T07Segment | undefined => act2T07.video.segments.find((segment) => timeMs >= segment.startMs && timeMs < segment.endMs);
export const keyFrameAt = (timeMs: number): T07KeyFrame | undefined => act2T07.video.keyFrames.find((frame) => timeMs >= frame.startMs && timeMs <= frame.endMs);
export const visualFrameAt = (timeMs: number): T07VisualFrame | undefined => act2T07.video.visualFrames.find((frame) => timeMs >= frame.startMs && timeMs < frame.endMs);
/** 只有落在登记窗口内的截图才推进剧情；窗口外的画面不可截。 */
export const isFrameCapturableAt = (frameId: string, timeMs: number): boolean => {
  const frame = keyFrameById.get(frameId);
  return frame !== undefined && Number.isFinite(timeMs) && timeMs >= frame.startMs && timeMs <= frame.endMs;
};

/** P05：错帧教学文案；不改提交对错，只改展示提示。 */
export const resolveT07MismatchNote = (frame: T07KeyFrame | undefined, featureId: string): string => {
  const notes = act2T07.comparison.mismatchNotesByKind;
  if (!frame) return act2T07.comparison.mismatchNote;
  if (frame.frameKind === 'trail') return notes.trail;
  if (frame.frameKind === 'interview') return notes.interview;
  if (frame.frameKind === 'temple') {
    if (featureId === 'mountain-road') return notes.templeRoad;
    return notes.templeOther;
  }
  return act2T07.comparison.mismatchNote;
};

/** T07 场景内可回看的 T06 公开资料；只读，不写入任何进度。 */
export const act2T06RecapPages: { id: string; headline: string; snippet: string }[] = (browserPagesDocument as { items: { id: string; title: string; headline?: string; snippet?: string }[] })
  .items.filter((page) => page.id.startsWith('PAGE_A2_T06_'))
  .map((page) => ({ id: page.id, headline: page.headline ?? page.title, snippet: page.snippet ?? '' }));

export const formatClock = (timeMs: number): string => {
  const total = Math.max(0, Math.round(timeMs / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/** 玩家可见文本不得越界到未确认的结论。 */
const ACT2_T07_FORBIDDEN_TERMS = ['鸡头岭', '第三幕', '现在还在', '肉食', '双 S 的本义'];
/** 外景对照只能用破庙外景，不能用“补”字石碑近照。 */
const ACT2_T07_EXTERIOR_IMAGE_ID = 'IMG_A1_I_001';

export function validateAct2T07Data(): void {
  const knownFlags = new Set((flagsDocument as { items: { id: string }[] }).items.map((flag) => flag.id));
  const knownNotes = new Set((notesDocument as { items: { id: string }[] }).items.map((note) => note.id));
  const knownImages = new Set([
    ...(imagesDocument as { items: { id: string }[] }).items.map((image) => image.id),
    'IMG_A2_T07_TRAIL_WALK_001',
  ]);
  if (act2T07.schemaVersion !== 1) throw new Error('act2_t07.json schemaVersion 必须为 1。');
  if (act2T07.record.act !== 2 || act2T07.record.phase !== 'A2_T07') throw new Error('T07 可追溯记录无效。');
  for (const flagId of [...act2T07.record.unlockCondition, ...act2T07.record.relatedFlags]) if (!knownFlags.has(flagId)) throw new Error(`T07 数据引用未登记 Flag：${flagId}`);
  for (const noteId of ['NOTE_A2_T07_001', 'NOTE_A2_T07_002', 'NOTE_A2_T07_003', 'NOTE_A2_T07_004']) if (!knownNotes.has(noteId)) throw new Error(`T07 缺少已登记笔记：${noteId}`);

  if (new Set(act2T07.materials.map((material) => material.id)).size !== act2T07.materials.length) throw new Error('T07 资料 ID 必须唯一。');
  if (!materialById.has(act2T07.photoMaterialId) || materialById.get(act2T07.photoMaterialId)?.kind !== 'photo') throw new Error('T07 合影资料 ID 无效。');
  if (!materialById.has(act2T07.video.materialId) || materialById.get(act2T07.video.materialId)?.kind !== 'video') throw new Error('T07 视频资料 ID 无效。');
  if (act2T07.promoSurfaceText.length === 0) throw new Error('T07 必须保留宣传资料的表层说辞。');

  const { video } = act2T07;
  if (video.durationMs <= 0 || video.frameMs <= 0 || video.stepMs <= 0) throw new Error('T07 视频时长或步进无效。');
  if (new Set(video.segments.map((segment) => segment.id)).size !== video.segments.length) throw new Error('T07 视频片段 ID 必须唯一。');
  if (new Set(video.keyFrames.map((frame) => frame.id)).size !== video.keyFrames.length || video.keyFrames.length < 3) throw new Error('T07 截图候选帧 ID 必须唯一且至少有三个可选画面。');
  if (video.keyFrames.filter((frame) => frame.supportsExteriorMatch).length !== 1) throw new Error('T07 只有一个截图候选画面应与破庙外景轮廓相符。');
  for (const frame of video.keyFrames) {
    if (frame.frameKind !== 'temple' && frame.frameKind !== 'trail' && frame.frameKind !== 'interview') throw new Error(`T07 关键帧缺少合法 frameKind：${frame.id}`);
    if (frame.supportsExteriorMatch !== (frame.frameKind === 'temple')) throw new Error(`T07 外景可对帧与 frameKind 不一致：${frame.id}`);
    if (frame.frameKind === 'temple' && frame.muteLabel) throw new Error(`T07 外景可对帧不应带静音标签：${frame.id}`);
    if (frame.frameKind !== 'temple' && !frame.muteLabel) throw new Error(`T07 非外景帧缺少 muteLabel：${frame.id}`);
  }
  const mismatchByKind = act2T07.comparison.mismatchNotesByKind;
  if (!mismatchByKind?.trail || !mismatchByKind.interview || !mismatchByKind.templeRoad || !mismatchByKind.templeOther) throw new Error('T07 缺少分型 mismatchNotesByKind。');
  if (!knownImages.has(act2T07.comparison.trailReference.imageId) || act2T07.comparison.trailReference.imageId !== 'IMG_A2_T07_TRAIL_REFERENCE_001') throw new Error('T07 树林参照图片未登记或资源 ID 不符。');
  if (!act2T07.comparison.trailReference.caption || !act2T07.comparison.trailReference.altText || !act2T07.comparison.trailReference.note) throw new Error('T07 树林参照缺少图注、替代文本或说明。');
  if (act2T07.comparison.guide.steps.length !== 3 || Object.values(act2T07.comparison.guide).some((value) => !value || (Array.isArray(value) && value.some((step) => !step)))) throw new Error('T07 对照区三步引导配置不完整。');
  if (!act2T07.comparison.featureOptions.some((option) => option.id === act2T07.comparison.matchFeatureId)) throw new Error('T07 外景对照特征选项无效。');
  if (video.segments.length === 0 || video.segments[0].startMs !== 0 || video.segments[video.segments.length - 1].endMs !== video.durationMs) throw new Error('T07 视频片段必须覆盖完整时长。');
  for (let index = 1; index < video.segments.length; index += 1) {
    if (video.segments[index].startMs !== video.segments[index - 1].endMs) throw new Error(`T07 视频片段必须首尾相接：${video.segments[index].id}`);
  }
  for (const segmentId of video.requiredSegmentIds) if (!segmentById.has(segmentId)) throw new Error(`T07 必需片段未登记：${segmentId}`);
  // 关键山路画面必须与相邻片段同属一个镜头，避免剪成不同日期的混剪。
  const trailSegments = video.segments.filter((segment) => segment.id === 'SEG_A2_T07_002' || segment.id === 'SEG_A2_T07_003');
  if (trailSegments.length !== 2 || new Set(trailSegments.map((segment) => segment.shotId)).size !== 1) throw new Error('T07 山路关键画面必须属于同一镜头。');
  for (const frame of video.keyFrames) {
    const segment = segmentById.get(frame.segmentId);
    if (!segment) throw new Error(`T07 关键帧片段无效：${frame.id}`);
    if (frame.startMs < segment.startMs || frame.endMs > segment.endMs || frame.endMs <= frame.startMs) throw new Error(`T07 关键帧窗口越界：${frame.id}`);
    if (frame.endMs - frame.startMs < 1000) throw new Error(`T07 关键帧窗口过窄：${frame.id}`);
  }
  if (video.visualFrames.length === 0 || video.visualFrames[0].startMs !== 0 || video.visualFrames[video.visualFrames.length - 1].endMs !== video.durationMs) throw new Error('T07 静帧必须覆盖完整视频时长。');
  for (let index = 0; index < video.visualFrames.length; index += 1) {
    const visual = video.visualFrames[index];
    if (visual.endMs <= visual.startMs || (index > 0 && visual.startMs !== video.visualFrames[index - 1].endMs)) throw new Error('T07 静帧时间不能重叠或留空。');
    if (!knownImages.has(visual.imageId)) throw new Error(`T07 静帧图片资源未登记：${visual.imageId}`);
  }
  for (const frame of video.keyFrames) {
    if (visualFrameAt(frame.startMs)?.imageId !== frame.imageId || visualFrameAt(frame.endMs)?.imageId !== frame.imageId) throw new Error(`T07 可截图窗口必须显示对应关键帧：${frame.id}`);
  }
  if (act2T07.comparison.exteriorImageId !== ACT2_T07_EXTERIOR_IMAGE_ID) throw new Error('T07 外景对照必须使用 IMG_A1_I_001 破庙外景。');
  if (!act2T07.inference.conclusion.includes('鸡公岭破庙附近')) throw new Error('T07 地点结论必须限制在鸡公岭破庙附近。');
  if (act2T07.trip.lines.length === 0 || !act2T07.trip.confirmLabel) throw new Error('T07 缺少共同决定进山的对话。');
  if (act2T07.finale.lines.length !== 3 || !act2T07.finale.lines[2].includes('启明')) throw new Error('T07 终幕旁白与规范不一致。');
  const visibleText = [
    act2T07.intro, act2T07.promoSurfaceNote, ...act2T07.promoSurfaceText,
    ...act2T07.materials.flatMap((material) => [material.title, material.caption, material.placeholderNote, material.xiaoyueLine ?? '', material.symbolNote ?? '', material.logoSpeculation ?? '', material.confirmedNote ?? '']),
    ...video.segments.flatMap((segment) => [segment.label, segment.line, segment.placeholderNote]),
    video.continuityNote, ...video.keyFrames.flatMap((frame) => [frame.caption, frame.altText, frame.placeholderNote]), ...act2T07.comparison.featureOptions.map((option) => option.label), act2T07.comparison.mismatchNote, ...Object.values(act2T07.comparison.mismatchNotesByKind), ...video.keyFrames.map((frame) => frame.muteLabel ?? ''),
    act2T07.comparison.trailReference.caption, act2T07.comparison.trailReference.altText, act2T07.comparison.trailReference.note,
    ...act2T07.comparison.guide.steps, act2T07.comparison.guide.findCapturedTemple, act2T07.comparison.guide.findTempleInVideo, act2T07.comparison.guide.confirmedStep,
    ...Object.values(act2T07.comparison), act2T07.inference.conclusion, act2T07.inference.caveat, act2T07.inference.lockedHint,
    ...act2T07.trip.lines.map((line) => line.text), act2T07.trip.plannedNote, act2T07.trip.gearNote,
    ...act2T07.finale.lines, act2T07.finale.closingNote,
  ].join('\n');
  for (const term of ACT2_T07_FORBIDDEN_TERMS) if (visibleText.includes(term)) throw new Error(`T07 玩家可见文本越界：${term}`);
  if (!visibleText.includes('鸡公岭')) throw new Error('T07 玩家可见文本必须使用已发布地名“鸡公岭”。');
}
validateAct2T07Data();
