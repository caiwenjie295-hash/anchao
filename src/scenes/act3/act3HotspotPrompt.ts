import type { Act3ActiveStage } from '../../core/types';
import { act3HotspotActionLabel } from '../../story/investigation/actionPresentation';

const UNOBSERVED_LABELS: Readonly<Record<string, string>> = {
  CLUE_A3_T02_SS_SCRATCH: '检查划痕',
  CLUE_A3_T03_24H: '查看门上标记',
  CLUE_A3_T03_PEEPHOLES: '检查窥孔与挡板',
  CLUE_A3_T03_48_72H: '核对门上标记',
  CLUE_A3_T04_VVAKE_PAPER: '查看纸片',
  CLUE_A3_T05_13ACK_PAPER: '查看纸片',
  CLUE_A3_T06_TEMPLE_COMPARE: '对照两张照片',
  CLUE_A3_T07_FIRST_PAGE: '核对第一页字迹',
};

/** A hotspot's visible and accessible prompt stays neutral until its existing observation is recorded. */
export function act3HotspotPrompt(
  stage: Act3ActiveStage,
  clueId: string,
  authoredLabel: string,
  inspectedClueIds: readonly string[],
): string {
  if (inspectedClueIds.includes(clueId)) {
    return act3HotspotActionLabel(stage, clueId, authoredLabel, inspectedClueIds);
  }
  return UNOBSERVED_LABELS[clueId] ?? act3HotspotActionLabel(stage, clueId, authoredLabel, inspectedClueIds);
}
