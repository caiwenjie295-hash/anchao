# BGM-INTERFACE-20261016 背景音乐接入预留

> 状态：冻结执行工单
> 基线：`b7fa3916a90edac2b85669938135019b0e74d787`
> 执行角色：单一执行 Agent
> 分支：`agent/BGM-INTERFACE-20261016-placeholder`
> 主审分支：`codex/BGM-INTERFACE-20261016-integration`

## 目标与边界

用户暂缓选曲和播放接入，仅预留配置接口。新增独立 TypeScript 类型与空配置；不生成、下载或添加音轨，不创建播放器、不添加界面、不触发请求或存储。待用户选曲后另开接入任务。当前上传包保持原版本。

## 冻结接口

- `src/media/backgroundMusic.ts` 导出只读 `BackgroundMusicTrack`（`title: string`、`src: string`），`BackgroundMusicConfig`（`track: BackgroundMusicTrack | null`、`volume: number`、`loop: boolean`）和 `backgroundMusicConfig`。
- 空配置 `track: null`、`volume: 0.2`、`loop: true`；volume 的接口约定为 0–1。
- 文件顶层只含类型和配置声明，不访问浏览器、存储或网络。不被 App、入口或现有音频模块引用；配置不代表已实现播放。
- 后续资源使用构建产物 URL，兼容 `/AnChao/` 与 file 离线包；本轮不填虚构路径。

## 文件所有权

- 执行 Agent 唯一允许写入：`src/media/backgroundMusic.ts`。
- 主审唯一允许写入：本工单、`docs/media/background-music.md`、`docs/reviews/BGM-INTERFACE-20261016.md`、`维护导航.md`；开发包根 `PROGRESS.md` 记录范围和后续任务。
- 只读：`AGENTS.md`、`维护导航.md`、`docs/协作开发与Git工作流.md`、现有 `src/media/investigationAudio.ts`、构建配置。
- 禁止：其他源码、剧情/data/Flag/schema、素材、既有音频、UI、构建/预加载脚本、历史图片及发布包；禁止合并 main、推送、部署。

## 验收

执行者先读取项目规则和本工单，仅实现一个无副作用配置文件，运行 `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` 与 `git diff --check`，提交后按角色/提交 SHA/路径/验证/待办报告。

主审检查精确路径和 diff，运行项目质量门禁（测试、网页/离线构建、双轮离线回归、离线包及 Chrome file 检查），APPROVED 后本地合并。没有界面变更，真实宽窄屏复测不适用；不为静态配置添加镜像实现的测试。发布包不重建交付，后续实际选曲/播放器/控件/音轨预加载另行实现。
