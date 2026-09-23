import { StateManager, stateManager as defaultManager } from '../../core/stateManager';
import type { Act2Stage } from '../../core/types';
import { BridgeInvestigation } from './BridgeInvestigation';
import { LibraryResearch } from './LibraryResearch';
import { TalesInvestigation } from './TalesInvestigation';
import { SchoolInvestigation } from './SchoolInvestigation';

/** 桥头场景通用外层的资源空位：`file: null`，只用克制 CSS 占位。 */
export const ACT2_BRIDGE_PLACEHOLDER_ASSET_ID = 'IMG_A2_T02_001';

/** 返回桌面后的中性继续入口文案；不泄露任何答案。 */
export const ACT2_RESUME_LABELS = {
  bridge: '继续桥头调查',
  library: '继续地方志调查',
  tales: '继续查阅三篇志异',
  school: '继续高中调查',
} as const;

export interface Act2ExperienceProps {
  /** 当前第二幕场景阶段；`search` 或 `inactive` 时本组件不应被挂载。 */
  stage: Extract<Act2Stage, 'bridge' | 'library' | 'tales' | 'school'>;
  /** 场景是否正在全屏显示；false 时只渲染桌面继续入口。 */
  sceneOpen: boolean;
  onDismissScene: () => void;
  onResumeScene: () => void;
  manager?: StateManager;
}

/**
 * 第二幕场景壳：只按 stage 连接 BridgeInvestigation 与 LibraryResearch，
 * 不硬编码任何剧情正文；场景关闭与恢复都只是瞬时显示状态。
 */
export function Act2Experience({ stage, sceneOpen, onDismissScene, onResumeScene, manager = defaultManager }: Act2ExperienceProps) {
  const isBridge = stage === 'bridge';
  const isLibrary = stage === 'library';
  const isSchool = stage === 'school';
  const placeholderAssetId = isBridge ? ACT2_BRIDGE_PLACEHOLDER_ASSET_ID : undefined;

  if (sceneOpen) {
    return (
      <div
        className={`act2-experience act2-experience--scene act2-experience--${stage}`}
        data-act2-stage={stage}
        data-asset-id={placeholderAssetId}
      >
        {isBridge
          ? <BridgeInvestigation manager={manager} onReturnDesktop={onDismissScene} />
          : isLibrary ? <LibraryResearch manager={manager} onReturnToDesktop={onDismissScene} />
            : isSchool ? <SchoolInvestigation manager={manager} onReturnToDesktop={onDismissScene} />
              : <TalesInvestigation manager={manager} onReturnToDesktop={onDismissScene} />}
      </div>
    );
  }

  return (
    <div
      className={`act2-experience act2-experience--resume act2-experience--resume-${stage}`}
      data-act2-stage={stage}
      data-asset-id={placeholderAssetId}
    >
      <button type="button" className="act2-experience__continue" onClick={onResumeScene}>
        {ACT2_RESUME_LABELS[stage]}
      </button>
    </div>
  );
}
