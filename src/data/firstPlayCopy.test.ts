import { describe, expect, it } from 'vitest';
import { act3T00, act3T01, act3T02, act3T03, act3T04, act3T05, act3T06, act3T07 } from './act3Data';

describe('Act 3 player-facing descriptions', () => {
  it('keeps production notes and internal lens references out of visible descriptions', () => {
    const descriptions = [act3T00, act3T01, act3T02, act3T03, act3T04, act3T05, act3T06, act3T07]
      .flatMap((stage) => stage.lenses.map((lens) => lens.description));
    const internalNotes = /\bT0[0-7]\b|\b00[1-9]\b|后期|叠层|方位锚点|普通构图|从位置\s*给|留位置/;

    expect(descriptions.filter((description) => internalNotes.test(description))).toEqual([]);
    expect(descriptions.join('\n')).toContain('2014 年 D');
  });
});
