import { describe, expect, it } from 'vitest';
import { visualIconNames } from '../components/VisualIcon';
import { forumAvatarForAuthor, mailAvatarForSender, siteMarkForName, visualIdentityAssetLedger, visualIdentityVectorLedger } from './visualIdentityData';

describe('visual identity mappings', () => {
  it('keeps source-page and search-result marks stable by visible site name', () => {
    expect(siteMarkForName('xxdaily.local')).toBe('news');
    expect(siteMarkForName('xxdaily.local')).toBe(siteMarkForName('xxdaily.local'));
    expect(siteMarkForName('unknown.local')).toBe(siteMarkForName('unknown.local'));
  });

  it('keeps forum avatars stable by nickname alone', () => {
    expect(forumAvatarForAuthor('黄山')).toEqual(forumAvatarForAuthor('黄山'));
    expect(forumAvatarForAuthor('路过的人')).not.toEqual(forumAvatarForAuthor('黄山'));
  });

  it('reuses the existing account sprite and one shared Wang Ao / Xiao A image', () => {
    expect(mailAvatarForSender('林予').spriteAssetId).toBe('IMG_A1_B_010');
    expect(mailAvatarForSender('小A').imageId).toBe('IMG_UI_IDENTITY_WANGAO_001');
    expect(mailAvatarForSender('图书馆').fallbackIcon).toBe('library');
    expect(visualIdentityAssetLedger).toHaveLength(1);
    expect(visualIdentityAssetLedger[0]?.uniqueWriter).toBe('agent/UX-IDENTITY-20261006-icons');
  });

  it('assigns every published vector glyph a stable asset id and purpose', () => {
    expect(visualIdentityVectorLedger).toHaveLength(visualIconNames.length);
    expect(new Set(visualIdentityVectorLedger.map(({ id }) => id)).size).toBe(visualIdentityVectorLedger.length);
    expect(visualIdentityVectorLedger.every(({ purpose }) => purpose.length > 0)).toBe(true);
  });
});
