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
});
