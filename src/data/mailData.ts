import filesDocument from '../../data/files.json';
import flagsDocument from '../../data/flags.json';
import foldersDocument from '../../data/mail_folders.json';
import mailsDocument from '../../data/mails.json';
import type { MailState } from '../core/types';

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

export type MailFolder = 'inbox' | 'sent' | 'subscriptions' | 'spam' | 'trash' | 'archive' | 'drafts';
export type MailFolderKey = MailFolder | 'starred';

export type MailFolderDefinition = TraceableRecord & {
  folderKey: MailFolderKey;
  label: string;
  sortOrder: number;
};

export type MailAttachment = TraceableRecord & {
  filename: string;
  mimeType: string;
};

export type Mail = TraceableRecord & {
  fromName: string;
  fromAddress: string;
  toAddresses: string[];
  sentAt: string;
  folder: MailFolder;
  subject: string;
  preview: string;
  body: string;
  initiallyRead: boolean;
  pinned: boolean;
  initiallyStarred: boolean;
  labels: string[];
  attachmentIds: string[];
};

type FlagDefinition = TraceableRecord & { defaultValue: boolean };
type Collection<T> = { schemaVersion: number; items: T[] };

const traceableFields: (keyof TraceableRecord)[] = ['id', 'title', 'act', 'phase', 'source', 'purpose', 'unlockCondition', 'relatedFlags', 'notes'];
const allowedFolders: MailFolder[] = ['inbox', 'sent', 'subscriptions', 'spam', 'trash', 'archive', 'drafts'];

const asCollection = <T>(document: unknown, name: string): Collection<T> => {
  if (typeof document !== 'object' || document === null || !Array.isArray((document as Collection<T>).items)) {
    throw new Error(`${name} 必须是带 items 数组的数据文档。`);
  }
  return document as Collection<T>;
};

const folders = asCollection<MailFolderDefinition>(foldersDocument, 'mail_folders.json').items;
const mails = asCollection<Mail>(mailsDocument, 'mails.json').items;
const attachments = asCollection<MailAttachment>(filesDocument, 'files.json').items;
const flags = asCollection<FlagDefinition>(flagsDocument, 'flags.json').items;

const assertTraceable = (record: TraceableRecord, label: string): void => {
  for (const field of traceableFields) {
    if (record[field] === undefined || record[field] === null || record[field] === '') throw new Error(`${label} 缺少可追溯字段 ${field}。`);
  }
  if (!Array.isArray(record.unlockCondition) || !Array.isArray(record.relatedFlags)) throw new Error(`${label} 的 Flag 字段必须是数组。`);
};

export const XIAOA_MAIL_ID = 'MAIL_A1_C_001';
export const XIAOA_MAIL_FLAGS = [
  'FLAG_A1_MAIL_XIAOA_FOUND',
  'FLAG_A1_MAIL_XIAOA_OPENED',
  'FLAG_A1_DATE_20200419_KNOWN',
  'FLAG_A1_LOCATION_KNOWN',
] as const;

export const mailById = new Map(mails.map((mail) => [mail.id, mail]));
export const attachmentById = new Map(attachments.map((attachment) => [attachment.id, attachment]));
export const flagById = new Map(flags.map((flag) => [flag.id, flag]));
export const mailFolders = [...folders].sort((left, right) => left.sortOrder - right.sortOrder);
export const initiallyStarredMailIds = mails.filter((mail) => mail.initiallyStarred).map((mail) => mail.id);

export function validateMailData(): void {
  const ids = new Set<string>();
  for (const record of [...folders, ...mails, ...attachments]) {
    assertTraceable(record, record.id || '未命名记录');
    if (ids.has(record.id)) throw new Error(`邮箱数据 ID 重复：${record.id}`);
    ids.add(record.id);
    for (const flagId of [...record.unlockCondition, ...record.relatedFlags]) {
      if (!flagById.has(flagId)) throw new Error(`${record.id} 引用了未注册 Flag：${flagId}`);
    }
  }
  if (mails.length < 36) throw new Error('邮箱至少需要 36 封内容完整的邮件。');
  if (folders.length !== 7 || new Set(folders.map((folder) => folder.folderKey)).size !== 7) throw new Error('邮箱文件夹定义不完整或重复。');
  for (const folder of folders) {
    if (![...allowedFolders, 'starred'].includes(folder.folderKey) || !Number.isFinite(folder.sortOrder)) throw new Error(`${folder.id} 的文件夹字段无效。`);
  }
  for (const attachment of attachments) {
    if (!attachment.id.startsWith('FILE_') || !attachment.filename || !attachment.mimeType) throw new Error(`${attachment.id} 的附件字段无效。`);
  }
  for (const mail of mails) {
    if (!mail.id.startsWith('MAIL_') || !allowedFolders.includes(mail.folder)) throw new Error(`${mail.id} 的文件夹字段无效。`);
    if (!mail.fromName || !mail.fromAddress || !mail.subject || !mail.preview || !mail.body || !Array.isArray(mail.toAddresses) || mail.toAddresses.length === 0) throw new Error(`${mail.id} 缺少完整邮件内容。`);
    if (Number.isNaN(new Date(mail.sentAt).getTime())) throw new Error(`${mail.id} 的发送时间无效。`);
    if (![mail.initiallyRead, mail.pinned, mail.initiallyStarred].every((value) => typeof value === 'boolean') || !Array.isArray(mail.labels) || !Array.isArray(mail.attachmentIds)) throw new Error(`${mail.id} 的邮件状态字段无效。`);
    for (const attachmentId of mail.attachmentIds) {
      if (!attachmentById.has(attachmentId)) throw new Error(`${mail.id} 引用了不可解析的附件：${attachmentId}`);
    }
  }
  const xiaoaMail = mailById.get(XIAOA_MAIL_ID);
  if (!xiaoaMail || xiaoaMail.folder !== 'inbox' || !xiaoaMail.pinned || !xiaoaMail.initiallyRead || xiaoaMail.initiallyStarred) throw new Error('小A关键邮件的置顶或初始状态不符合契约。');
  if (!xiaoaMail.body.includes('2020') || !xiaoaMail.body.includes('我要出门一趟') || !xiaoaMail.body.includes('不要担心') || !xiaoaMail.body.includes('XX县')) throw new Error('小A关键邮件缺少日期、行程或地点内容。');
  const pinnedInbox = mails.filter((mail) => mail.folder === 'inbox' && mail.pinned);
  if (pinnedInbox.length < 3) throw new Error('置顶分组至少需要三封邮件。');
  if (!mails.some((mail) => mail.folder === 'sent' && mail.toAddresses.includes(xiaoaMail.fromAddress) && new Date(mail.sentAt).getTime() > new Date(xiaoaMail.sentAt).getTime())) throw new Error('已发送中缺少给小A的后续回复。');
}

validateMailData();

export const isMailRead = (mail: Mail, state: MailState): boolean => mail.initiallyRead || state.readIds.includes(mail.id);
export const isMailStarred = (mail: Mail, state: MailState): boolean => state.starredIds.includes(mail.id);

const matchesSearch = (mail: Mail, searchTerm: string): boolean => {
  const query = searchTerm.trim().toLocaleLowerCase();
  if (!query) return true;
  return [mail.fromName, mail.fromAddress, mail.toAddresses.join(' '), mail.subject, mail.preview, mail.body, mail.sentAt, ...mail.labels]
    .join(' ')
    .toLocaleLowerCase()
    .includes(query);
};

export const getMailsForFolder = (folderKey: MailFolderKey, state: MailState, searchTerm = ''): Mail[] => mails
  .filter((mail) => (folderKey === 'starred' ? isMailStarred(mail, state) : mail.folder === folderKey))
  .filter((mail) => matchesSearch(mail, searchTerm))
  .sort((left, right) => new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime());

export type MailGroup = { id: string; label: string; mails: Mail[] };

export const getMailGroups = (folderKey: MailFolderKey, state: MailState, searchTerm = ''): MailGroup[] => {
  const visible = getMailsForFolder(folderKey, state, searchTerm);
  const pinned = folderKey === 'inbox' ? visible.filter((mail) => mail.pinned) : [];
  const rest = folderKey === 'inbox' ? visible.filter((mail) => !mail.pinned) : visible;
  const byYear = new Map<string, Mail[]>();
  for (const mail of rest) {
    const year = new Date(mail.sentAt).getFullYear().toString();
    byYear.set(year, [...(byYear.get(year) ?? []), mail]);
  }
  const groups: MailGroup[] = pinned.length > 0 ? [{ id: 'pinned', label: '置顶', mails: pinned }] : [];
  [...byYear.entries()].sort(([left], [right]) => Number(right) - Number(left)).forEach(([year, groupedMails]) => groups.push({ id: `year-${year}`, label: year, mails: groupedMails }));
  return groups;
};

export const getFolderCount = (folderKey: MailFolderKey, state: MailState): number => getMailsForFolder(folderKey, state).length;
