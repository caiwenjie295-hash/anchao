import { describe, expect, it } from 'vitest';
import { act2School, schoolAreaRoute, schoolCampusLocations, schoolCampusRoute, validateAct2SchoolData } from './act2SchoolData';
import { ACT2_SCHOOL_AREA_IDS, ACT2_SCHOOL_HOTSPOT_IDS } from '../core/types';

describe('T05 school data', () => {
  it('registers every frozen area and hotspot with the exact ranking and testimonial', () => {
    expect(() => validateAct2SchoolData()).not.toThrow();
    expect(act2School.areas.map((area) => area.id)).toEqual(ACT2_SCHOOL_AREA_IDS);
    expect(act2School.hotspots.map((item) => item.id)).toEqual(ACT2_SCHOOL_HOTSPOT_IDS);
    expect(act2School.hotspots.find((item) => item.id === 'HOTSPOT_A2_T05_RANKS')?.ranks).toEqual([600, 400, 300, 130, 88, 53, 20]);
    expect(act2School.hotspots.find((item) => item.id === 'HOTSPOT_A2_T05_QIMING_TEXT')?.content).toContain('启明青少年成长中心两个月来对我的教育和培养');
  });

  it('keeps the eight school photos distinct and the indoor/outdoor routes faithful to the two-level map', () => {
    expect(new Set(act2School.areas.map((area) => area.imageId)).size).toBe(8);
    expect(schoolCampusLocations.map(({ id, x, y }) => [id, x, y])).toEqual([
      ['CAMPUS_SOUTH_GATE', 50, 90],
      ['CAMPUS_COURTYARD', 50, 72],
      ['CAMPUS_HONOR', 72, 76],
      ['CAMPUS_NOTICE', 28, 76],
      ['CAMPUS_BUILDING', 48, 35],
      ['CAMPUS_PLAYGROUND', 18, 42],
      ['CAMPUS_DORM', 82, 26],
    ]);
    expect(schoolCampusLocations.find(({ id }) => id === 'CAMPUS_BUILDING')?.imageId).toBe('IMG_A2_SCHOOL_BUILDING_001');
    expect(schoolCampusLocations.find(({ id }) => id === 'CAMPUS_BUILDING')?.imageId).not.toBe('IMG_A2_SCHOOL_MAP_001');
    expect(schoolCampusRoute('CAMPUS_SOUTH_GATE', 'CAMPUS_BUILDING')).toEqual(['CAMPUS_SOUTH_GATE', 'CAMPUS_COURTYARD', 'CAMPUS_BUILDING']);
    expect(schoolCampusRoute('CAMPUS_SOUTH_GATE', 'CAMPUS_PLAYGROUND')).toEqual(['CAMPUS_SOUTH_GATE', 'CAMPUS_COURTYARD', 'CAMPUS_PLAYGROUND']);
    expect(schoolAreaRoute('AREA_A2_T05_GATE', 'AREA_A2_T05_XIAOYUE_CLASSROOM')).toEqual(['AREA_A2_T05_GATE', 'AREA_A2_T05_CORRIDOR', 'AREA_A2_T05_XIAOYUE_CLASSROOM']);
    expect(schoolAreaRoute('AREA_A2_T05_GATE', 'AREA_A2_T05_TEACHER_OFFICE')).toEqual(['AREA_A2_T05_GATE', 'AREA_A2_T05_CORRIDOR', 'AREA_A2_T05_TEACHER_OFFICE']);
    expect(schoolAreaRoute('AREA_A2_T05_HONOR_ROLL', 'AREA_A2_T05_NOTICE_BOARD')).toEqual(['AREA_A2_T05_HONOR_ROLL', 'AREA_A2_T05_NOTICE_BOARD']);
  });
});
