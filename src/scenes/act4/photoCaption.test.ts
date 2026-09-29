import { describe, expect, it } from 'vitest';
import { birthdayScenes } from '../../data/act4/content';
import { laterScenes } from '../../data/act4/laterContent';
import { photoCaptionLead } from './photoCaption';

describe('fourth act photo captions', () => {
  it('keeps every T05–T10 caption short while preserving the full scene text', () => {
    for (const scene of [...birthdayScenes, ...laterScenes]) {
      const lead = photoCaptionLead(scene.text);
      expect(Array.from(lead).length).toBeLessThanOrEqual(38);
      expect(lead).not.toBe(scene.text);
      expect(scene.text.startsWith(lead.replace(/…$/, ''))).toBe(true);
    }
  });
});
