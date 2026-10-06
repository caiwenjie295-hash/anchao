import type { Act3ActiveStage } from '../../core/types';
import { act3HotspotLabelFor } from '../../data/act3Presentation';

const OBSERVATION_LABELS: Readonly<Record<string, string>> = {
  CLUE_A3_T00_DEPART: '确认向县城出发',
  CLUE_A3_T00_CAVE_SHELTER: '看看山洞内',
  CLUE_A3_T01_GATE_ENTERED: '看看门内情况',
  CLUE_A3_T01_INNER_FENCE: '查看内层围栏',
  CLUE_A3_T01_MAIN_BUILDING: '查看主楼入口',
  CLUE_A3_T02_CLASSROOM_DOOR: '看看教室内',
  CLUE_A3_T02_CORRIDOR_TURN: '看看走廊拐角',
  CLUE_A3_T03_DESCEND: '确认下楼路线',
  CLUE_A3_T04_EMPTY_ROOM: '看看屋内',
  CLUE_A3_T06_DOOR: '查看厨房门牌',
  CLUE_A3_T07_EXIT_ROUTE: '确认离开路线',
};

/** Hotspot labels describe an observation or an explicit object action; movement stays on route buttons. */
export function act3HotspotActionLabel(
  stage: Act3ActiveStage,
  clueId: string,
  authoredLabel: string,
  inspectedClueIds: readonly string[],
): string {
  return OBSERVATION_LABELS[clueId] ?? act3HotspotLabelFor(stage, clueId, authoredLabel, inspectedClueIds);
}

/** Route controls expose only the direction already shown by the current scene. */
export function act3RouteActionLabel(kind: 'move' | 'return'): string {
  return kind === 'return' ? '沿原路返回' : '继续探索';
}

/** Stage completion is a separate action from changing to another nearby view. */
export function act3StageActionLabel(): string {
  return '离开这里，继续探索';
}
