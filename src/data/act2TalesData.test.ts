import { describe, expect, it } from 'vitest';
import { act2Tales, taleCards, taleNoiseRecords, tales, validateAct2TalesData } from './act2TalesData';

describe('act2 T04 tale data', () => {
  it('keeps three original tales, five noise records and twelve sortable cards', () => {
    expect(() => validateAct2TalesData()).not.toThrow();
    expect(tales).toHaveLength(3); expect(taleNoiseRecords.length).toBeGreaterThanOrEqual(5); expect(taleCards).toHaveLength(12);
  });
  it('separates original text from modern explanation and uses the running place name', () => {
    for (const tale of tales) { expect(tale.paragraphs.join('\n')).not.toContain('鸡头岭'); expect(tale.modernExplanation).toBeTruthy(); }
    expect(act2Tales.scene.inference).toHaveLength(2);
  });
});
