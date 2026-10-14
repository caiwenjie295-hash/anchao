import { describe, expect, it } from 'vitest';
import { act2School, schoolAreaRoute, schoolCampusLocations, schoolCampusRoute, schoolCampusRoutePolylines, validateAct2SchoolData } from './act2SchoolData';
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
      ['CAMPUS_SOUTH_GATE', 50, 81.5],
      ['CAMPUS_COURTYARD', 50, 74.5],
      ['CAMPUS_HONOR', 64.6, 72.3],
      ['CAMPUS_NOTICE', 37.2, 72.3],
      ['CAMPUS_BUILDING', 51.4, 40.5],
      ['CAMPUS_PLAYGROUND', 24.5, 43],
      ['CAMPUS_DORM', 83, 21.5],
    ]);
    expect(schoolCampusLocations.find(({ id }) => id === 'CAMPUS_BUILDING')?.imageId).toBe('IMG_A2_SCHOOL_BUILDING_001');
    expect(schoolCampusLocations.find(({ id }) => id === 'CAMPUS_BUILDING')?.imageId).not.toBe('IMG_A2_SCHOOL_MAP_001');
    expect(schoolCampusRoute('CAMPUS_SOUTH_GATE', 'CAMPUS_BUILDING')).toEqual(['CAMPUS_SOUTH_GATE', 'CAMPUS_COURTYARD', 'CAMPUS_BUILDING']);
    expect(schoolCampusRoute('CAMPUS_SOUTH_GATE', 'CAMPUS_PLAYGROUND')).toEqual(['CAMPUS_SOUTH_GATE', 'CAMPUS_COURTYARD', 'CAMPUS_PLAYGROUND']);
    expect(schoolAreaRoute('AREA_A2_T05_GATE', 'AREA_A2_T05_XIAOYUE_CLASSROOM')).toEqual(['AREA_A2_T05_GATE', 'AREA_A2_T05_CORRIDOR', 'AREA_A2_T05_XIAOYUE_CLASSROOM']);
    expect(schoolAreaRoute('AREA_A2_T05_GATE', 'AREA_A2_T05_TEACHER_OFFICE')).toEqual(['AREA_A2_T05_GATE', 'AREA_A2_T05_CORRIDOR', 'AREA_A2_T05_TEACHER_OFFICE']);
    expect(schoolAreaRoute('AREA_A2_T05_HONOR_ROLL', 'AREA_A2_T05_NOTICE_BOARD')).toEqual(['AREA_A2_T05_HONOR_ROLL', 'AREA_A2_T05_NOTICE_BOARD']);
  });

  it('keeps campus route polylines attached to true anchors and preserves the walkable-road bends', () => {
    const pointsByLocation = new Map(schoolCampusLocations.map(({ id, x, y }) => [id, { x, y }]));
    const edgeKey = (from: string, to: string) => [from, to].sort().join('::');
    const graphEdges = new Set(schoolCampusLocations.flatMap(({ id, links }) => links.map((to) => edgeKey(id, to))));
    const pathEdges = new Set(schoolCampusRoutePolylines.map(({ from, to }) => edgeKey(from, to)));
    expect(pathEdges).toEqual(graphEdges);
    for (const path of schoolCampusRoutePolylines) {
      expect(path.points[0]).toEqual(pointsByLocation.get(path.from));
      expect(path.points.at(-1)).toEqual(pointsByLocation.get(path.to));
      expect(path.points.every(({ x, y }) => x >= 0 && x <= 100 && y >= 0 && y <= 100)).toBe(true);
    }
    expect(schoolCampusRoutePolylines.map(({ from, to, points }) => [from, to, points])).toEqual([
      ['CAMPUS_SOUTH_GATE', 'CAMPUS_COURTYARD', [{ x: 50, y: 81.5 }, { x: 50, y: 74.5 }]],
      ['CAMPUS_COURTYARD', 'CAMPUS_BUILDING', [{ x: 50, y: 74.5 }, { x: 55.5, y: 74.5 }, { x: 55.5, y: 60 }, { x: 51.4, y: 60 }, { x: 51.4, y: 40.5 }]],
      ['CAMPUS_COURTYARD', 'CAMPUS_HONOR', [{ x: 50, y: 74.5 }, { x: 64.6, y: 74.5 }, { x: 64.6, y: 72.3 }]],
      ['CAMPUS_COURTYARD', 'CAMPUS_NOTICE', [{ x: 50, y: 74.5 }, { x: 37.2, y: 74.5 }, { x: 37.2, y: 72.3 }]],
      ['CAMPUS_COURTYARD', 'CAMPUS_PLAYGROUND', [{ x: 50, y: 74.5 }, { x: 32.5, y: 74.5 }, { x: 32.5, y: 51.5 }, { x: 24.5, y: 51.5 }, { x: 24.5, y: 43 }]],
      ['CAMPUS_COURTYARD', 'CAMPUS_DORM', [{ x: 50, y: 74.5 }, { x: 73.5, y: 74.5 }, { x: 73.5, y: 26.5 }, { x: 83, y: 26.5 }, { x: 83, y: 21.5 }]],
      ['CAMPUS_HONOR', 'CAMPUS_NOTICE', [{ x: 64.6, y: 72.3 }, { x: 64.6, y: 74.5 }, { x: 37.2, y: 74.5 }, { x: 37.2, y: 72.3 }]],
    ]);
    expect(schoolCampusLocations.map(({ id, labelX, labelY }) => [id, labelX, labelY])).toEqual([
      ['CAMPUS_SOUTH_GATE', 36, 85],
      ['CAMPUS_COURTYARD', 50, 58],
      ['CAMPUS_HONOR', 80, 72.3],
      ['CAMPUS_NOTICE', 12, 72.3],
      ['CAMPUS_BUILDING', 51.4, 25],
      ['CAMPUS_PLAYGROUND', 24.5, 27],
      ['CAMPUS_DORM', 88, 39],
    ]);
    for (const mapWidth of [280, 350]) {
      const mapHeight = mapWidth * 0.75;
      const boxes = schoolCampusLocations.map((location) => ({
        location,
        centerX: mapWidth * location.labelX / 100,
        centerY: mapHeight * location.labelY / 100,
        width: 62,
        height: 44,
      }));
      for (let index = 0; index < boxes.length; index += 1) {
        const box = boxes[index];
        const anchorX = mapWidth * box.location.x / 100;
        const anchorY = mapHeight * box.location.y / 100;
        const edgeGapX = Math.max(Math.abs(anchorX - box.centerX) - box.width / 2, 0);
        const edgeGapY = Math.max(Math.abs(anchorY - box.centerY) - box.height / 2, 0);
        expect(Math.hypot(edgeGapX, edgeGapY)).toBeGreaterThan(5);
        for (const other of boxes.slice(index + 1)) {
          const separatedX = Math.abs(box.centerX - other.centerX) >= (box.width + other.width) / 2;
          const separatedY = Math.abs(box.centerY - other.centerY) >= (box.height + other.height) / 2;
          expect(separatedX || separatedY).toBe(true);
        }
      }
    }
  });
});
