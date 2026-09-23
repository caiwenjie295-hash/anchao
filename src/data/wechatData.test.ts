import { describe, expect, it } from 'vitest';
import {
  assetIds,
  getConversationMessages,
  getUnreadCount,
  MOM_CONTACT_ID,
  MOM_READ_FLAG,
  MOM_TRIGGERED_FLAG,
  validateWechatData,
  visibleContacts,
} from './wechatData';
import { createDefaultState } from '../core/defaultState';

describe('wechat data', () => {
  it('has traceable, resolvable contacts, flags and placeholder resources', () => {
    expect(() => validateWechatData()).not.toThrow();
    expect(visibleContacts.length).toBeGreaterThanOrEqual(8);
    expect(new Set(visibleContacts.map((contact) => contact.kind))).toEqual(new Set(['person', 'group', 'system']));
    expect(assetIds.size).toBeGreaterThanOrEqual(14);
  });

  it('keeps the phase B mother message hidden until triggered and derives its unread state', () => {
    const state = createDefaultState().game;
    expect(getConversationMessages(MOM_CONTACT_ID, state).some((message) => message.id === 'CHAT_A1_B_001')).toBe(false);
    expect(getUnreadCount(MOM_CONTACT_ID, state)).toBe(0);
    state.flags[MOM_TRIGGERED_FLAG] = true;
    expect(getConversationMessages(MOM_CONTACT_ID, state).some((message) => message.id === 'CHAT_A1_B_001')).toBe(true);
    expect(getUnreadCount(MOM_CONTACT_ID, state)).toBe(1);
    state.flags[MOM_READ_FLAG] = true;
    expect(getUnreadCount(MOM_CONTACT_ID, state)).toBe(0);
  });

  it('keeps Xiaoyue’s T05 messages hidden until T04 inference and includes varied life content', () => {
    const state = createDefaultState().game;
    expect(getConversationMessages('CONTACT_A1_A_002', state).some((message) => message.id.startsWith('CHAT_A2_T05_'))).toBe(false);
    state.flags.FLAG_A2_TRANSFER_RULE_INFERRED = true;
    const messages = getConversationMessages('CONTACT_A1_A_002', state).filter((message) => message.id.startsWith('CHAT_A2_T05_'));
    expect(messages).toHaveLength(10);
    expect(messages.filter((message) => message.kind === 'text')).toHaveLength(5);
    expect(messages.filter((message) => message.kind === 'image').map((message) => message.assetId)).toContain('IMG_A2_T05_009');
    expect(messages.every((message) => message.conversationId === 'CONTACT_A1_A_002')).toBe(true);
  });
});
