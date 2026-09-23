import { describe, expect, it } from 'vitest';
import { act2School, validateAct2SchoolData } from './act2SchoolData';
import { ACT2_SCHOOL_AREA_IDS, ACT2_SCHOOL_HOTSPOT_IDS } from '../core/types';

describe('T05 school data', () => {
  it('registers every frozen area and hotspot with the exact ranking and testimonial', () => {
    expect(() => validateAct2SchoolData()).not.toThrow();
    expect(act2School.areas.map((area) => area.id)).toEqual(ACT2_SCHOOL_AREA_IDS);
    expect(act2School.hotspots.map((item) => item.id)).toEqual(ACT2_SCHOOL_HOTSPOT_IDS);
    expect(act2School.hotspots.find((item) => item.id === 'HOTSPOT_A2_T05_RANKS')?.ranks).toEqual([600, 400, 300, 130, 88, 53, 20]);
    expect(act2School.hotspots.find((item) => item.id === 'HOTSPOT_A2_T05_QIMING_TEXT')?.content).toContain('启明青少年成长中心两个月来对我的教育和培养');
  });
});
