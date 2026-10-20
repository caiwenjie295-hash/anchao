import { describe, expect, it } from 'vitest';
import { act3RouteLabelFor, act3StageCompletionLabel } from './act3Presentation';

describe('Act 3 field route labels', () => {
  it('distinguishes moving to a new photo from returning to a prior photo', () => {
    expect(act3RouteLabelFor('move')).toBe('下一张现场照片');
    expect(act3RouteLabelFor('return')).toBe('返回上一张现场照片');
    expect(act3StageCompletionLabel()).toBe('结束本阶段，前往下一处');
  });
});
