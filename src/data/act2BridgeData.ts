import bridgeDocument from '../../data/act2_bridge.json';
import { ACT2_EVIDENCE_ASSET_IDS } from '../core/types';
import type { HeibumuNamePart } from '../core/types';

export type BridgeNamePart = HeibumuNamePart;

export interface BridgeTrace {
  taskId: string;
  workOrder: string;
  contract: string;
  storySpec: string;
  stage: string;
  baseline: string;
  updatedAt: string;
}

export interface BridgeSceneCopy {
  title: string;
  location: string;
  intro: string;
  chatPrompt: string;
  askMountainLabel: string;
  evidencePanelTitle: string;
  evidencePanelHint: string;
  returnLabel: string;
}

export interface BridgeAudioCopy {
  audioId: string;
  phrase: string;
  replayLabel: string;
  replayNotice: string;
  replaySuffixTemplate: string;
}

export interface BridgeEvidenceItem {
  assetId: string;
  name: string;
  description: string;
}

export interface BridgeElder {
  id: string;
  name: string;
  isClueElder: boolean;
  chat: string[];
  mountainReply: string[];
  /** 仅线索老人具备：看到证据后的反应与口述原话。 */
  evidenceLead?: string;
  phrase?: string;
  phraseAfter?: string;
}

export interface BridgePuzzlePart {
  part: BridgeNamePart;
  label: string;
  options: string[];
}

export interface BridgePuzzle {
  id: string;
  notebookPrompt: string;
  question: string;
  parts: BridgePuzzlePart[];
  correct: Record<BridgeNamePart, string>;
  maxAttempts: number;
  lockPart: BridgeNamePart;
  lockValue: string;
  lockedHint: string;
  confirmLabel: string;
  guessingNote: string;
}

export interface BridgeResolution {
  entryId: string;
  entryTitle: string;
  entryBody: string;
  entryRelated: string;
  elderRemark: string;
  flagId: string;
  noteId: string;
  continueLabel: string;
  nextStage: 'library';
}

export interface Act2BridgeData {
  schemaVersion: number;
  trace: BridgeTrace;
  scene: BridgeSceneCopy;
  audio: BridgeAudioCopy;
  evidence: BridgeEvidenceItem[];
  elders: BridgeElder[];
  puzzle: BridgePuzzle;
  resolution: BridgeResolution;
  flags: { evidenceShown: string; audioHeard: string };
  noteIds: { phraseHeard: string };
}

const FROZEN_FLAG_IDS: Record<keyof Act2BridgeData['flags'], string> = {
  evidenceShown: 'FLAG_A2_ELDER_PHOTO_SHOWN',
  audioHeard: 'FLAG_A2_HEIBUMU_AUDIO_HEARD',
};

const FROZEN_NOTE_IDS: Record<keyof Act2BridgeData['noteIds'], string> = {
  phraseHeard: 'NOTE_A2_T02_001',
};

const FROZEN_OPTIONS: Record<BridgeNamePart, string[]> = {
  first: ['黑', '嘿'],
  middle: ['捕', '补', '埔'],
  last: ['木', '母', '墓'],
};

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isNonEmptyString);

/** 校验桥头数据：冻结 ID、唯一性、白名单与谜题固定选项必须逐字符合契约。 */
export function validateBridgeData(data: Act2BridgeData = act2BridgeData): void {
  if (data.schemaVersion !== 1) throw new Error('act2_bridge.json schemaVersion 必须为 1。');
  if (!isNonEmptyString(data.trace.taskId) || data.trace.taskId !== 'WB-0003') throw new Error('act2_bridge.json 缺少可追溯任务记录。');

  for (const key of Object.keys(FROZEN_FLAG_IDS) as (keyof Act2BridgeData['flags'])[]) {
    if (data.flags[key] !== FROZEN_FLAG_IDS[key]) throw new Error(`${key} 必须使用冻结 Flag：${FROZEN_FLAG_IDS[key]}`);
  }
  for (const key of Object.keys(FROZEN_NOTE_IDS) as (keyof Act2BridgeData['noteIds'])[]) {
    if (data.noteIds[key] !== FROZEN_NOTE_IDS[key]) throw new Error(`${key} 必须使用冻结笔记：${FROZEN_NOTE_IDS[key]}`);
  }

  if (!isNonEmptyString(data.scene.title) || !isNonEmptyString(data.scene.intro) || !isNonEmptyString(data.scene.returnLabel)) throw new Error('桥头场景文案不完整。');
  if (!isNonEmptyString(data.audio.audioId) || data.audio.audioId !== 'AUDIO_A2_T02_001') throw new Error('口述音频占位必须标记 AUDIO_A2_T02_001。');
  if (data.audio.phrase !== '黑捕木。') throw new Error('口述原话必须保持“黑捕木。”，系统不得自动纠正。');

  const evidenceIds = data.evidence.map((item) => item.assetId);
  if (evidenceIds.length !== ACT2_EVIDENCE_ASSET_IDS.length || !ACT2_EVIDENCE_ASSET_IDS.every((id) => evidenceIds.includes(id))) {
    throw new Error(`桥头证据只允许复用：${ACT2_EVIDENCE_ASSET_IDS.join('、')}`);
  }
  for (const item of data.evidence) {
    if (!isNonEmptyString(item.name) || !isNonEmptyString(item.description)) throw new Error(`${item.assetId} 缺少中性名称或说明。`);
  }

  const elderIds = new Set<string>();
  const clueElders = data.elders.filter((elder) => elder.isClueElder);
  if (data.elders.length < 4) throw new Error('桥头至少需要 4 位老人。');
  if (clueElders.length !== 1) throw new Error('桥头必须恰好有一位线索老人。');
  for (const elder of data.elders) {
    if (!elder.id.startsWith('ELDER_A2_T02_')) throw new Error(`老人 ID 必须使用 ELDER_A2_T02_ 前缀：${elder.id}`);
    if (elderIds.has(elder.id)) throw new Error(`老人 ID 重复：${elder.id}`);
    elderIds.add(elder.id);
    if (!isNonEmptyString(elder.name)) throw new Error(`${elder.id} 缺少称呼。`);
    if (!isStringArray(elder.chat) || !isStringArray(elder.mountainReply)) throw new Error(`${elder.id} 的生活闲谈不能为空。`);
    if (elder.isClueElder && (!isNonEmptyString(elder.evidenceLead) || !isNonEmptyString(elder.phrase) || !isNonEmptyString(elder.phraseAfter))) {
      throw new Error('线索老人缺少证据反应或口述原话。');
    }
  }

  if (data.puzzle.maxAttempts !== 3) throw new Error('同音字谜题必须连续 3 次错误后锁定。');
  if (data.puzzle.lockPart !== 'middle' || data.puzzle.lockValue !== '补') throw new Error('只允许锁定中间字“补”。');
  if (!isNonEmptyString(data.puzzle.lockedHint)) throw new Error('锁定后必须提供来自数据的弱提示。');
  const seenParts = new Set<BridgeNamePart>();
  for (const part of data.puzzle.parts) {
    seenParts.add(part.part);
    if (JSON.stringify(part.options) !== JSON.stringify(FROZEN_OPTIONS[part.part])) throw new Error(`谜题 ${part.part} 的选项不符合冻结配置。`);
    if (data.puzzle.correct[part.part] !== '黑补母'[part.part === 'first' ? 0 : part.part === 'middle' ? 1 : 2]) throw new Error(`谜题 ${part.part} 的正确答案不符合冻结配置。`);
  }
  if (seenParts.size !== 3) throw new Error('谜题必须覆盖首字、中字、末字三段。');

  if (!isNonEmptyString(data.resolution.entryTitle) || !isNonEmptyString(data.resolution.entryBody)) throw new Error('解出名称后的正式词条不完整。');
  if (!isNonEmptyString(data.resolution.elderRemark)) throw new Error('缺少老人补充。');
  if (data.resolution.flagId !== 'FLAG_A2_COUNTY_RECORD_HINT_KNOWN') throw new Error('完成反馈必须写 FLAG_A2_COUNTY_RECORD_HINT_KNOWN。');
  if (data.resolution.noteId !== 'NOTE_A2_T02_002') throw new Error('完成反馈必须加入 NOTE_A2_T02_002。');
  if (data.resolution.nextStage !== 'library') throw new Error('桥头完成后只能进入 library 阶段。');
}

export const act2BridgeData = bridgeDocument as Act2BridgeData;
validateBridgeData(act2BridgeData);

export const bridgeScene = act2BridgeData.scene;
export const bridgeAudio = act2BridgeData.audio;
export const bridgeEvidence = act2BridgeData.evidence;
export const bridgeElders = act2BridgeData.elders;
export const bridgeClueElder = act2BridgeData.elders.find((elder) => elder.isClueElder)!;
export const bridgePuzzle = act2BridgeData.puzzle;
export const bridgeResolution = act2BridgeData.resolution;
export const bridgeFlagIds = act2BridgeData.flags;
export const bridgeNoteIds = act2BridgeData.noteIds;
