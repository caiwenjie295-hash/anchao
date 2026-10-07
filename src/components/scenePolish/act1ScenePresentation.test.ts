import { describe, expect, it } from 'vitest';
import { shouldRenderAct1Scene } from './act1ScenePresentation';

describe('local Act1 scene visibility', () => {
  it('keeps the opening journey curtain visible before a scene id exists', () => {
    expect(shouldRenderAct1Scene(true, null, null)).toBe(true);
  });

  it('hides only the matching scene after returning, then restores that same scene without changing its id', () => {
    expect(shouldRenderAct1Scene(true, 'A1_T00_001', null)).toBe(true);
    expect(shouldRenderAct1Scene(true, 'A1_T00_001', 'A1_T00_001')).toBe(false);
    expect(shouldRenderAct1Scene(true, 'A1_T00_001', null)).toBe(true);
    expect(shouldRenderAct1Scene(true, 'A1_T00_002', 'A1_T00_001')).toBe(true);
  });
});
