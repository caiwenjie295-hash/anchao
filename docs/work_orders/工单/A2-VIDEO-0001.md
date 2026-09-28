# A2-VIDEO-0001 第二幕 T07 受访视频关键帧

## 目标与负责人

Codex 在 `codex/A2-VIDEO-0001-keyframes` 独立 worktree 接入关键帧图片，使现有 16 秒播放器在分镜时间显示连续静帧，保留播放、步进、截图、外景对照和存档语义。用户授权以关键帧代替视频素材；本工单不制作视频文件。

## 写入范围

- 唯一代码写入者：Codex 本任务。
- 允许：`data/act2_t07.json`、`data/images.json`、`src/data/act2T07Data.ts` 及其测试、`src/scenes/act2/T07Investigation.tsx` 及其测试、`src/act2/t07Finale.css`、`src/第二幕/IMG_A2_T07_001.jpg` 至 `008.jpg`（`006` 复用 `005`，没有独立文件）、本工单和 `docs/reviews/A2-VIDEO-0001.md`。
- 只读：`src/Photo_src/石庙外景1.png`、`docs/work_orders/工单/WB-0010.md`、既有 T07 状态管理及第一幕资源。
- 禁止：主仓库未提交图片和其他工作区；Flag、存档 schema、片段 ID、截图窗口、第一幕数据；`node_modules`、`dist`、`暗潮.html`。

## 资源与验收

- 使用 `003` 采访、`004` 山路、`005` 6.8–8.6 秒破庙关键画面、`006` 同帧放大，以及新增 `008` 转弯后的离开帧。时间到图像的选择由数据定义；不改原有片段和关键帧 ID。
- `005` 的破庙形体与 `IMG_A1_I_001` 可比较，`006` 资源 ID 直接复用 `005` 的同一文件，由前端确定性放大，避免生成另一座庙。图片由独立 Luna High 对话生成，主任务审查并接入。
- 窄屏适配按用户要求留到整体开发完成后；本次完成 PC 宽屏检查。
- 运行 `git diff --check`、`npm test`、`npm run build`、`npm run build:offline`、`npm run test:offline`，通过后主审记录审查结论再合并。
