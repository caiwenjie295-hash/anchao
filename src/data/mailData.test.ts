import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { XIAOA_MAIL_ID, getMailGroups, getMailsForFolder, isMailRead, mailById, validateMailData } from './mailData';

describe('mail data', () => {
  it('has complete, traceable mail and attachment references', () => {
    expect(() => validateMailData()).not.toThrow();
    expect(mailById.size).toBeGreaterThanOrEqual(36);
  });

  it('keeps the already-read Xiaoa mail in a neutral three-item pinned inbox group', () => {
    const state = createDefaultState().modules.mail;
    const groups = getMailGroups('inbox', state);
    const pinned = groups[0];
    const xiaoaMail = mailById.get(XIAOA_MAIL_ID);
    expect(pinned).toMatchObject({ id: 'pinned', label: '置顶' });
    expect(pinned.mails).toHaveLength(3);
    expect(pinned.mails.map((mail) => mail.id)).toContain(XIAOA_MAIL_ID);
    expect(xiaoaMail && isMailRead(xiaoaMail, state)).toBe(true);
  });

  it('seeds initial stars into persisted state so every star can later be toggled off', () => {
    const state = createDefaultState().modules.mail;
    expect(getMailsForFolder('starred', state)).toHaveLength(4);
  });

  it('searches formal mail content and retains chronological list sorting', () => {
    const state = createDefaultState().modules.mail;
    expect(getMailsForFolder('inbox', state, '小A').map((mail) => mail.id)).toEqual([XIAOA_MAIL_ID]);
    const sent = getMailsForFolder('sent', state);
    expect(sent.map((mail) => new Date(mail.sentAt).getTime())).toEqual([...sent.map((mail) => new Date(mail.sentAt).getTime())].sort((left, right) => right - left));
  });
});
