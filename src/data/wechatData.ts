import chatsDocument from '../../data/chats.json';
import contactsDocument from '../../data/contacts.json';
import eventsDocument from '../../data/events.json';
import flagsDocument from '../../data/flags.json';
import type { GameState } from '../core/types';

export type TraceableRecord = {
  id: string;
  title: string;
  act: number;
  phase: string;
  source: string;
  purpose: string;
  unlockCondition: string[];
  relatedFlags: string[];
  notes: string;
};

export type ContactKind = 'person' | 'group' | 'system';
export type ChatKind = 'text' | 'image' | 'file' | 'voice' | 'system';

export type WechatContact = TraceableRecord & {
  name: string;
  kind: ContactKind;
  avatarAssetId: string;
  pinned: boolean;
  sortOrder: number;
  visibleInList?: boolean;
};

export type WechatMessage = TraceableRecord & {
  conversationId: string;
  senderId: string;
  timestamp: string;
  kind: ChatKind;
  content: string;
  assetId: string | null;
  durationSeconds: number | null;
};

export type WechatEvent = TraceableRecord & {
  eventType: 'delayed-chat';
  contactId: string;
  delayMs: number;
  completionFlagId: string;
};

type FlagDefinition = TraceableRecord & { defaultValue: boolean };
type Collection<T> = { schemaVersion: number; items: T[] };

const traceableFields: (keyof TraceableRecord)[] = ['id', 'title', 'act', 'phase', 'source', 'purpose', 'unlockCondition', 'relatedFlags', 'notes'];
const asCollection = <T>(document: unknown, name: string): Collection<T> => {
  if (typeof document !== 'object' || document === null || !Array.isArray((document as Collection<T>).items)) {
    throw new Error(`${name} 必须是带 items 数组的数据文档。`);
  }
  return document as Collection<T>;
};

const contacts = asCollection<WechatContact>(contactsDocument, 'contacts.json').items;
const messages = asCollection<WechatMessage>(chatsDocument, 'chats.json').items;
const events = asCollection<WechatEvent>(eventsDocument, 'events.json').items;
const flags = asCollection<FlagDefinition>(flagsDocument, 'flags.json').items;

const assertTraceable = (record: TraceableRecord, label: string): void => {
  for (const field of traceableFields) {
    if (record[field] === undefined || record[field] === null || record[field] === '') throw new Error(`${label} 缺少可追溯字段 ${field}。`);
  }
  if (!Array.isArray(record.unlockCondition) || !Array.isArray(record.relatedFlags)) throw new Error(`${label} 的 Flag 字段必须是数组。`);
};

export const MOM_CONTACT_ID = 'CONTACT_A1_A_001';
export const SELF_CONTACT_ID = 'CONTACT_A1_A_010';
export const MOM_TRIGGERED_FLAG = 'FLAG_A1_MOM_MSG_TRIGGERED';
export const MOM_READ_FLAG = 'FLAG_A1_MOM_MSG_READ';
export const XIAOA_MISSING_KNOWN_FLAG = 'FLAG_A1_XIAOA_MISSING_KNOWN';

export const contactById = new Map(contacts.map((contact) => [contact.id, contact]));
export const messageById = new Map(messages.map((message) => [message.id, message]));
export const flagById = new Map(flags.map((flag) => [flag.id, flag]));
export const assetIds = new Set([...contacts.map((contact) => contact.avatarAssetId), ...messages.flatMap((message) => message.assetId ? [message.assetId] : [])]);

export function validateWechatData(): void {
  const allRecords = [...contacts, ...messages, ...events, ...flags];
  const ids = new Set<string>();
  for (const record of allRecords) {
    assertTraceable(record, record.id || '未命名记录');
    if (ids.has(record.id)) throw new Error(`微信数据 ID 重复：${record.id}`);
    ids.add(record.id);
    for (const flagId of [...record.unlockCondition, ...record.relatedFlags]) {
      if (flagId !== 'APP_WECHAT_OPENED' && !flagById.has(flagId)) throw new Error(`${record.id} 引用了未注册 Flag：${flagId}`);
    }
  }
  for (const contact of contacts) {
    if (!['person', 'group', 'system'].includes(contact.kind) || !contact.avatarAssetId.startsWith('IMG_')) throw new Error(`${contact.id} 的联系人字段无效。`);
  }
  for (const message of messages) {
    if (!contactById.has(message.conversationId) || !contactById.has(message.senderId)) throw new Error(`${message.id} 引用了不存在的联系人。`);
    if (!['text', 'image', 'file', 'voice', 'system'].includes(message.kind)) throw new Error(`${message.id} 的消息类型无效。`);
    if (message.assetId !== null && !assetIds.has(message.assetId)) throw new Error(`${message.id} 引用了不可解析的资源。`);
    if ((message.kind === 'image' || message.kind === 'file' || message.kind === 'voice') && message.assetId === null) throw new Error(`${message.id} 缺少占位资源 ID。`);
    if (message.kind !== 'voice' && message.durationSeconds !== null) throw new Error(`${message.id} 的时长字段应为 null。`);
    if (message.kind === 'voice' && (message.durationSeconds === null || message.durationSeconds < 1)) throw new Error(`${message.id} 缺少有效语音时长。`);
  }
  for (const event of events) {
    if (!contactById.has(event.contactId) || !flagById.has(event.completionFlagId) || event.delayMs < 0) throw new Error(`${event.id} 的事件引用无效。`);
  }
  if (!messages.find((message) => message.id === 'CHAT_A1_B_001' && message.unlockCondition.includes(MOM_TRIGGERED_FLAG))) throw new Error('母亲阶段 B 消息未正确注册。');
}

validateWechatData();

export const visibleContacts = contacts.filter((contact) => contact.visibleInList !== false).sort((left, right) => left.sortOrder - right.sortOrder);
export const momMessageEvent: WechatEvent = (() => {
  const event = events.find((candidate) => candidate.id === 'EVENT_A1_B_001');
  if (!event) throw new Error('未找到 EVENT_A1_B_001。');
  return event;
})();

const flagIsTrue = (state: GameState, flagId: string): boolean => state.flags[flagId] === true;
const messageIsUnlocked = (message: WechatMessage, state: GameState): boolean => message.unlockCondition.every((flagId) => flagIsTrue(state, flagId));

export const getConversationMessages = (conversationId: string, state: GameState): WechatMessage[] => messages
  .filter((message) => message.conversationId === conversationId && messageIsUnlocked(message, state))
  .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());

export const getUnreadCount = (contactId: string, state: GameState): number => {
  if (contactId !== MOM_CONTACT_ID || !flagIsTrue(state, MOM_TRIGGERED_FLAG) || flagIsTrue(state, MOM_READ_FLAG)) return 0;
  return getConversationMessages(contactId, state).filter((message) => message.senderId === MOM_CONTACT_ID && message.unlockCondition.includes(MOM_TRIGGERED_FLAG)).length;
};

export const getLatestMessage = (contactId: string, state: GameState): WechatMessage | undefined => getConversationMessages(contactId, state).at(-1);
